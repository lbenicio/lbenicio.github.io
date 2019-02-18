---
layout: post
title: "Fix Google Photo backup OSX dark mode"
description: ""
category: 
tags: [tutorial, fix, google photos]
---
{% include JB/setup %}
As at the beginning of the Google Drive at OSX dark mode, the Google Photos Backup do not adept it’s menu bar icon to Dark Mode, even worst, at Photos, it even came the dark mode icons at download.

![](/assets/img/post/googlePhotos.png)

So, i made a little script to solve this problem.

To run it, make it could change files, so:

{% highlight Bash %}
# chmod 777 fix_google_photos.sh
than: (to change to dark mode icons)

# /fix_google_photos.sh black
or: (to change to white mode icons)

# /fix_google_photos.sh white
{% endhighlight %}

Downloads: [fixGooglePhotos](http://github.com/lbenicio/fixGooglePhotos)