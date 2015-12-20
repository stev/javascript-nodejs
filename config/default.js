var path = require('path');
var fs = require('fs');
var env = process.env;

// NODE_ENV = development || test || production
env.NODE_ENV = env.NODE_ENV || 'development';

//if (!env.SITE_HOST) throw new Error("env.SITE_HOST is not set");
//if (!env.STATIC_HOST) throw new Error("env.STATIC_HOST is not set");

var secret = require('./secret');

var lang = env.NODE_LANG || 'ru';

if (env.DEV_TRACE) {
  Error.stackTraceLimit = 10000;
  require('trace');
  require('clarify');
}

var config = module.exports = {
  // production domain, for tutorial imports, descriptions, etc
  // for the places where in-dev we must use a real domain
  domain: {
    main:   lang == 'en' ? 'learn.javascript.info' : 'learn.javascript.ru',
    static: lang == 'en' ? 'en.js.cx' : 'js.cx'
  },

  server: {
    port:       env.PORT || 3000,
    host:       env.HOST || '0.0.0.0',
    siteHost:   env.SITE_HOST || '',
    staticHost: env.STATIC_HOST || ''
  },

  ga: {
    id: lang == 'ru' ? 'UA-2056213-16' : 'UA-2056213-19'
  },

  yandexMetrika: {
    id: lang == 'ru' ? 17649010 : 32184394
  },

  test: {
    e2e: {
      sshHost:  secret.test.e2e.sshHost, // remote host for testing e2e callbacks
      sshUser:  secret.test.e2e.sshUser,
      siteHost: secret.test.e2e.siteHost,
      browser:  env.E2E_BROWSER || 'firefox'
    }
  },

  mongoose: require('./mongoose'),

  cloudflare: {
    url:    'https://www.cloudflare.com/api_json.html',
    apiKey: secret.cloudflare.apiKey,
    email:  secret.cloudflare.email
  },

  xmpp: {
    server: 'javascript.ru',
    admin:  secret.xmpp.admin
  },

  appKeys:  [secret.sessionKey],
  auth:     {
    session:    {
      key:     'sid',
      prefix:  'sess:',
      cookie:  {
        httpOnly:  true,
        path:      '/',
        overwrite: true,
        signed:    true,
        maxAge:    3600 * 4 * 1e3 // session expires in 4 hours, remember me lives longer
      },
      // touch session.updatedAt in DB & reset cookie on every visit to prolong the session
      // koa-session-mongoose resaves the session as a whole, not just a single field
      rolling: true
    },
    rememberMe: {
      key:    'remember',
      cookie: {
        httpOnly:  true,
        path:      '/',
        overwrite: true,
        signed:    true,
        maxAge:    7 * 3600 * 24 * 1e3 // 7days
      }
    },

    providers: require('./authProviders')
  },
  payments: require('./payments'),

  imgur:    secret.imgur,
  adminKey: secret.adminKey,

  certDir: path.join(secret.dir, 'cert'),

  disqus: {
    domain: lang == 'en' ? 'javascriptinfo' : 'learnjavascriptru'
  },


  openexchangerates: {
    appId: secret.openexchangerates.appId
  },

  jb:      secret.jb,
  lang:    lang,
  elastic: {
    host: 'http://localhost:9200'
  },

  plnkrAuthId: secret.plnkrAuthId,

  assetVersioning: env.ASSET_VERSIONING == 'file' ? 'file' :
                     env.ASSET_VERSIONING == 'query' ? 'query' : null,

  mailer: require('./mailer'),

  jade:   {
    basedir: path.join(process.cwd(), 'templates'),
    cache:   env.NODE_ENV != 'development'
  },
  crypto: {
    hash: {
      length:     128,
      // may be slow(!): iterations = 12000 take ~60ms to generate strong password
      iterations: env.NODE_ENV == 'production' ? 12000 : 1
    }
  },

  deploy: {
    user:             'root',
    privateKey:       fs.existsSync(path.join(secret.dir, 'js_rsa')) ? fs.readFileSync(path.join(secret.dir, 'js_rsa')) : '',
    buildPath:        "/js/build",
    targetPath:       "/js/javascript-nodejs",
    productionBranch: "production-" + lang,
    repo:             "git@github.com:iliakan/javascript-nodejs.git"
  },

  sauceLabs: {
    username:  secret.sauceLabs.username,
    accessKey: secret.sauceLabs.accessKey,
    address:   'http://ondemand.saucelabs.com:80/wd/hub'
  },

  renderedCacheEnabled:  env.NODE_ENV == 'production',
  projectRoot:           process.cwd(),
  // public files, served by nginx
  publicRoot:            path.join(process.cwd(), 'public'),
  // private files, for expiring links, not directly accessible
  downloadRoot:          path.join(process.cwd(), 'download'),
  courseRoot:            path.join(process.cwd(), 'course'),
  tmpRoot:               path.join(process.cwd(), 'tmp'),
  localesRoot:           path.join(process.cwd(), 'locales'),
  // js/css build versions
  manifestRoot:          path.join(process.cwd(), 'manifest'),
  migrationsRoot:        path.join(process.cwd(), 'migrations'),
  tutorialGithubBaseUrl: 'https://github.com/iliakan/javascript-tutorial/blob/' + lang,

  handlers: require('./handlers')
};

// webpack config uses general config
// we have a loop dep here
config.webpack = require('./webpack')(config);
require('./i18n');
