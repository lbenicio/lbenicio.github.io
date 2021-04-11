source "https://rubygems.org"
ruby "2.7.2"

# This is the default theme for new Jekyll sites. You may change this to anything you like.
gem "minima"

# If you want to use GitHub Pages, remove the "gem "jekyll"" above and
# uncomment the line below. To upgrade, run `bundle update github-pages`.
gem 'github-pages', '~> 206', group: :jekyll_plugins

gem 'rouge'

# If you have any plugins, put them here!
group :jekyll_plugins do
    gem "jekyll-feed"
    gem 'jekyll-seo-tag'
end

gem "puma"
gem "rack", "2.1.4"
#gem "github-pages", "206"

group :development, :test do
  gem "rspec"
  gem "selenium-webdriver"
  gem "chromedriver-helper"
  gem "capybara"
  gem "rack-jekyll"
  gem "pry"
  gem 'html-proofer'
end
