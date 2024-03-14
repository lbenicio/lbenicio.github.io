var ngrokConnector = require("ngrok");
module.exports = function (grunt) {
  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON("package.json"),
    connect: {
      server: {
        options: {
          port: 40918,
          base: "public",
        },
      },
    },
    htmllint: {
      options: {
        "id-class-style": false,
        "line-no-trailing-whitespace": false,
        "indent-width": false,
        "attr-quote-style": false,
        "link-req-noopener": false,
        "tag-bans": [],
        "spec-char-escape": false,
        "id-class-no-ad": false,
        "title-max-len": false,
        "lang-style": false,
        "id-no-dup": false,
        "line-end-style": false,
        "indent-style": false,
        "attr-bans": [],
      },
      src: ["public/**/*.html"],
    },
    jshint: {
      src: ["public/assets/js/main.js"],
    },
    uglify: {
      js: {
        files: {
          "public/assets/js/main.js": ["js/main.js"],
        },
      },
    },
    pagespeed: {
      options: {
        nokey: true,
      },
      desktop: {
        options: {
          locale: "en_GB",
          strategy: "desktop",
          threshold: 80,
        },
      },
    },
  });

  grunt.loadNpmTasks("grunt-htmllint");
  grunt.loadNpmTasks("grunt-contrib-jshint");
  grunt.loadNpmTasks("grunt-contrib-uglify");
  grunt.loadNpmTasks("grunt-pagespeed");
  grunt.loadNpmTasks("grunt-contrib-connect");

  grunt.registerTask(
    "pagespeed-via-ngrok",
    "Run Google PageSpeed via ngrok",
    function () {
      var done = this.async();
      var port = 40918;

      ngrokConnector.connect(port, function (err, url) {
        if (err !== null) {
          grunt.fail.fatal(err);
          return done();
        }
        grunt.config.set("pagespeed.options.url", url);
        grunt.task.run("pagespeed");
        done();
      });
    }
  );

  grunt.registerTask("perf-tests", ["connect", "pagespeed-via-ngrok"]);

  // Default task(s).
  grunt.registerTask("default", ["jshint", "htmllint", "uglify"]);
};
