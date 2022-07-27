source "https://rubygems.org"

gem "jekyll", "~> 4.2.0"
gem "lbenicio-minimal-v1", "0.2.36", git: "https://github.com/lbenicio/lbenicio-minimal-v1", branch: "pagination"

group :jekyll_plugins do
  gem "jekyll-feed", "~> 0.12"
  gem "jekyll-seo-tag"
  gem "jekyll-sitemap"
  gem "jekyll-minifier", "0.1.8", git: "https://github.com/lbenicio/jekyll-minifier", branch: "master"
end

gem "rouge"
gem "rake"

group :development, :test do
  gem "rspec"
  gem "selenium-webdriver"
  gem "chromedriver-helper"
  gem "capybara"
  gem "rack-jekyll"
  gem "pry"
  gem "html-proofer"
end

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", "~> 1.2"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.1.1", :platforms => [:mingw, :x64_mingw, :mswin]

