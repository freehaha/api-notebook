module.exports = {
  application: {
    url:           'http://notebook.freehaha.org',
    title:         'API Notebook',
    oauthCallback: '/authenticate/oauth.html'
  },
  pkg: require('../package.json'),
  embed: {
    script: 'http://notebook.freehaha.org/scripts/embed.js'
  },
  plugins: {}
};
