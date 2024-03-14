const themeDir = __dirname + "/../../../";
const siteDir = __dirname + "/../../../../../";

module.exports = {
  theme: {
    content: [
      `${themeDir}/layouts/**/*.html`,
      `${themeDir}/content/**/*.md`,
      `${siteDir}/layouts/**/*.html`,
      `${siteDir}/content/**/*.md`,
    ],
    extend: {},
  },
  content: [
    `./layouts/**/*.html`,
    `./content/**/*.md`,
    `${themeDir}/layouts/**/*.html`,
    `${themeDir}/content/**/*.md`,
    `${siteDir}/layouts/**/*.html`,
    `${siteDir}/content/**/*.md`,
  ],
  variants: {},
  plugins: [],
};
