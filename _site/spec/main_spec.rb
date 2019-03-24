describe "Main Page", type: :feature, js: true do
  it "Main page has main site description" do
    visit '/'
    # `binding.pry` is useful for crafting the right selector
    # or checking the actual state of the page
    binding.pry # test will pause here
    expect(find('#main-container').text).to eq('Hi,')
  end

  it "blog has the page title" do
    visit '/blog'
    # `binding.pry` is useful for crafting the right selector
    # or checking the actual state of the page
    binding.pry # test will pause here
    expect(find('.post-title'))
  end

  it "blog post has content" do
    visit '/blog'
    # `binding.pry` is useful for crafting the right selector
    # or checking the actual state of the page
    binding.pry # test will pause here
    expect(find('article'))
  end
end