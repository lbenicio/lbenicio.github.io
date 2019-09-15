function darkmode() {
  var darkmode = localStorage.getItem('darkmode');
  var body = document.getElementById('body');

  if (darkmode == '1') {
    localStorage.setItem('darkmode', '0');
    body.classList.remove("darkmode");
  }
  else {
    localStorage.setItem('darkmode', '1');  
    body.classList.add("darkmode");

  }
}

