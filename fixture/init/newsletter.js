const mongoose = require('mongoose');

var Newsletter = require('newsletter').Newsletter;
var Subscription = require('newsletter').Subscription;

exports.Subscription = [];

exports.Newsletter = [
  {
    title: "Курс и скринкасты по Node.JS",
    slug:  "nodejs",
    period: "несколько раз в год",
    weight: 1
  },
  {
    title: "Курс JavaScript/DOM/интерфейсы",
    period: "раз в 1.5-2 месяца",
    weight: 0,
    slug:  "js"
  },
  {
    title: "Продвинутые курсы, мастер-классы и конференции по JavaScript",
    period: "редко",
    weight: 2,
    slug:  "advanced"
  }
];

