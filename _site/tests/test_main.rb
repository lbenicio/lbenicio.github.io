require "helper"

class ExampleTest < JekyllUnitTest
  should "render a div containing the Page title" do
    @joule.render(%Q[
      ---
      title: "Yiss"
      ---
      <div class="aww">
        {{ page.title }}
      </div>
    ])

    el = @joule.find(".aww")

    assert(el)
    assert(el.text.include?("Yiss"))
    assert(el["class"].include?("aww"))
  end
end