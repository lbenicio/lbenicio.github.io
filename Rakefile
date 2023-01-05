# frozen_string_literal: true

abort('Please run this using `bundle exec rake`') unless ENV['BUNDLE_BIN_PATH']
require 'html-proofer'

desc 'Test the website'
task :test do
  sh 'bundle exec jekyll build'
  options = {
    check_sri: false,
    check_external_hash: true,
    disable_external: true,
    check_favicon: false,
    check_html: true,
    check_img_http: true,
    check_opengraph: true,
    enforce_https: true,
    cache: {
      timeframe: '6w'
    },
    validation: {
      report_eof_tags: true,
      report_invalid_tags: true,
      report_mismatched_tags: true,
      report_missing_doctype: true,
      report_missing_names: true,
      report_script_embeds: true
    }
  }
  begin
    HTMLProofer.check_directory('_site/', options).run
  rescue StandardError => e
    puts e.to_s
  end
end

task default: [:test]
