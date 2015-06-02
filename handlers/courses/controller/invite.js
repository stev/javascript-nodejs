const Course = require('../models/course');
const CourseInvite = require('../models/courseInvite');
const config = require('config');
const CourseGroup = require('../models/courseGroup');
const onAddParticipant = require('../lib/onAddParticipant');
const User = require('users').User;
const VideoKey = require('videoKey').VideoKey;
const _ = require('lodash');
const countries = require('countries');
const LOGIN_SUCCESSFUL = 1;
const LOGGED_IN_ALREADY = 2;
const NO_SUCH_USER = 3;
const CourseParticipant = require('../models/courseParticipant');
const ImgurImage = require('imgur').ImgurImage;
const log = require('log')();


exports.all = function*() {

  if (this.method != 'POST' && this.method != 'GET') {
    this.throw(404);
  }

  var invite = yield CourseInvite.findOne({
    token: this.params.inviteToken || this.request.body && this.request.body.inviteToken
  }).populate('group order').exec();

  this.locals.mailto = "mailto:orders@javascript.ru";

  if (!invite) {
    this.throw(404);
  }

  if (invite.order) {
    this.locals.mailto += "?subject=" + encodeURIComponent('Заказ ' + invite.order.number);
  }

  var userByEmail = yield User.findOne({
    email: invite.email
  }).exec();

  if (invite.accepted) {
    if (this.user) {
      this.addFlashMessage("success", "Поздравляем, вы присоединились к курсу. Ниже, рядом с курсом, вы найдёте инструкцию.");
      this.redirect(this.user.getProfileUrl() + '/courses');
    } else {
      this.authAndRedirect(userByEmail.getProfileUrl() + '/courses');
    }
    return;
  }

  // invite is also a login token, so we limit it's validity
  if (invite.validUntil < Date.now()) {
    this.body = this.render("invite/outdated");
    return;
  }

  //yield CourseGroup.populate(invite.group, {path: 'participants'});
  yield CourseGroup.populate(invite.group, 'course');


  var participantByEmail = yield CourseParticipant.findOne({
    isActive: true,
    group: invite.group._id,
    user: userByEmail._id
  }).exec();


  // invite was NOT accepted, but this guy is a participant (added manually?),
  // so show the same as accepted
  if (participantByEmail) {
    if (this.user) {
      this.addFlashMessage("success", "Вы уже участник курса. Ниже, рядом с курсом, вы найдёте инструкцию.");
      this.redirect(this.user.getProfileUrl() + '/courses');
    } else {
      this.authAndRedirect(userByEmail.getProfileUrl() + '/courses');
    }
    return;
  }

  // invalid invite, person not in list
  if (!~invite.order.data.emails.indexOf(invite.email)) {
    this.body = this.render('invite/deny', {
      email:       invite.email,
      contactName: invite.order.data.contactName,
      orderNumber: invite.order.number
    });

    return;
  }

  // ----------- INVITE IS VALID ----------------

  this.locals.title = invite.group.title;
  this.locals.invite = invite;

  var isLoggedIn = yield* loginByInvite.call(this, invite);

  if (isLoggedIn == NO_SUCH_USER) {
    if (this.user) this.logout();
    yield* register.call(this, invite);

  } else {
    if (isLoggedIn == LOGIN_SUCCESSFUL) {
      this.locals.wasLoggedIn = true;
    }
    yield* askParticipantDetails.call(this, invite);
  }

};

function* askParticipantDetails(invite) {

  // NB: this.user is the right user, guaranteed by loginByInvite

  var selectCountries = Object.create(countries.all);
  selectCountries[""] = {
    "co": "",
    "ph": "",
    "na": " выберите страну "
  };

  this.locals.title = "Анкета участника\n" + invite.group.title;
  this.locals.countries = selectCountries;

  if (this.method == 'POST') {
    var participantData = _.pick(this.request.body,
      'photoId firstName surname country city aboutLink occupation purpose wishes'.split(' ')
    );
    participantData.user = this.user._id;
    participantData.group = invite.group._id;

    if (participantData.photoId) {
      var photo = yield ImgurImage.findOne({imgurId: this.request.body.photoId}).exec();
      if (photo) { // no photo if stale form (?) or just bad post
        participantData.photo = photo.link;
      }
    }

    if (!participantData.photo && this.user.photo) {
      participantData.photo = this.user.photo;
    }


    var participant = new CourseParticipant(participantData);

    try {

      yield participant.persist();

    } catch (e) {
      var errors = {};
      for (var key in e.errors) {
        errors[key] = e.errors[key].message;
      }

      this.body = this.render('invite/askParticipantDetails', {
        errors: errors,
        form:   participantData
      });

      return;
    }

    this.log.debug(participant.toObject(), "participant is accepted");

    // make the new picture user avatar
    if (participant.photo && !this.user.photo) {
      yield this.user.persist({
        photo: participant.photo
      });
    }

    yield* acceptParticipant.call(this, invite, participant);

    // will show "welcome" cause the invite is accepted
    this.redirect('/courses/invite/' + invite.token);

  } else if (this.method == 'GET') {

    this.body = this.render('invite/askParticipantDetails', {
      errors: {},
      form:   {
        country: 'ru'
      }
    });

  }

}

function* acceptParticipant(invite) {

  this.user.profileTabsEnabled.addToSet('courses');
  yield this.user.persist();

  yield invite.accept();

  invite.group.decreaseParticipantsLimit();

  yield invite.group.persist();

  yield* onAddParticipant(invite.group);

}


function* register(invite) {

  if (this.method == 'POST') {

    // do register the man, email is verified
    var user = new User({
      email:         invite.email,
      displayName:   this.request.body.displayName,
      password:      this.request.body.password,
      verifiedEmail: true
    });

    try {
      yield user.persist();
    } catch (e) {
      var errors = {};
      for (var key in e.errors) {
        errors[key] = e.errors[key].message;
      }

      this.body = this.render('invite/register', {
        errors: e.errors,
        form:   {
          displayName: this.request.body.displayName,
          password:    this.request.body.password
        }
      });
      return;
    }

    yield this.login(user);

    this.redirect('/courses/invite/' + invite.token);

  } else {
    this.body = this.render('invite/register', {
      errors: {},
      form:   {}
    });
  }
}

/**
 * Logs in the current user using invite data
 * Makes email verified
 * @param invite
 * @returns LOGIN_SUCCESSFUL / NO_SUCH_USER / LOGGED_IN_ALREADY
 */
function* loginByInvite(invite) {

  if (this.user && this.user.email == invite.email) {
    return LOGGED_IN_ALREADY;
  }

  var userByEmail = yield User.findOne({
    email: invite.email
  }).exec();

  if (!userByEmail) return NO_SUCH_USER;

  if (!userByEmail.verifiedEmail) {
    // if pending verification => invite token confirms email
    yield userByEmail.persist({
      verifiedEmail: true
    });
  }

  yield this.login(userByEmail);
  return LOGIN_SUCCESSFUL;
}
