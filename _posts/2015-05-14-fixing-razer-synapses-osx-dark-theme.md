---
layout: post
title: "Fixing Razer Synapses OSX Dark Theme"
description: ""
category: 
tags: [tutorial, razer, fix]
---
{% include JB/setup %}
Since i’ve downloaded the Razer synapses i got a lot of problem, they are terrible with softwares, but still do good hardware.

![](/assets/img/post/razer1.png)
![](/assets/img/post/razer2.png)

OK, so, the problem is on dark mode OSX Yosemite (10.10), the Synapase do got at dark theme, so i made a shell script to solde that problem. At the Terminal.app:

Downloads: [RazerFix](http://github.com/lbenicio/fixRazerSynapses).

{% highlight Bash %}
chmod 777 razer.sh
./razer.sh black (for dark mode icon)

./razer.sh white (for white mode icon – icons back to normal)
{% endhighlight %}
 