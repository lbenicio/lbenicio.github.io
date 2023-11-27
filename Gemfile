source "https://rubygems.org"

gem "jekyll"
gem "lbenicio-minimal-v1", "1.3.2"
gem "rouge"
gem "rake"

group :jekyll_plugins do
  gem "jekyll-feed"
  gem "jekyll-seo-tag"
  gem "jekyll-sitemap"
  gem "jekyll-archives"
  gem "jekyll-tagging"
  gem "jekyll-tagging-related_posts"
  # fix for using theme's pagination theme
  gem "jekyll-paginate-v2", git: "https://github.com/lbenicio/jekyll-paginate-v2/"
  gem "jekyll-minifier"
end

group :development, :test do
  gem "rubocop"
  gem "rubocop-minitest"
  gem "rubocop-performance"
  gem "rubocop-rake"
  gem "rubocop-rspec"
  gem "jekyll_test_plugin"
  gem "jekyll_test_plugin_malicious"
  gem "benchmark-ips"
  gem "rbtrace"
  gem "ruby-prof"
  gem "stackprof"
  gem "memory_profiler"
  gem "httpclient"
  gem "rspec"
  gem "selenium-webdriver"
  gem "webdriver"
  gem "capybara"
  gem "rack-jekyll"
  gem "pry"
  gem "html-proofer"
end

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", :platforms => [:mingw, :x64_mingw, :mswin]

