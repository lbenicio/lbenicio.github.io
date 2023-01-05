# frozen_string_literal: true

source 'https://rubygems.org'

gem 'jekyll', '~> 4.2.0'
gem 'lbenicio-minimal-v1', '1.0.9'

group :jekyll_plugins do
  gem 'jekyll-feed', '~> 0.12'
  gem 'jekyll-minifier'
  gem 'jekyll-seo-tag'
  gem 'jekyll-sitemap'
end

gem 'rake'
gem 'rouge'

group :development, :test do
  gem 'capybara'
  gem 'chromedriver-helper'
  gem 'html-proofer'
  gem 'pry'
  gem 'rack-jekyll'
  gem 'rspec'
  gem 'selenium-webdriver'
end

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem 'tzinfo', '~> 1.2'
  gem 'tzinfo-data'
end

# Performance-booster for watching directories on Windows
gem 'wdm', '~> 0.1.1', platforms: %i[mingw x64_mingw mswin]
