

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

  window.addEventListener('DOMContentLoaded', (event) => {
    if (localStorage.getItem('darkmode') == "1") {
      var body = document.getElementById('body');
      body.classList.add("darkmode");
    }
     

     const menu = document.getElementById('menu');
let menuVisible = false;

console.log(menu)

const toggleMenu = command => {
  menu.style.display = command === "show" ? "block" : "none";
  menuVisible = !menuVisible;
};

const setPosition = ({ top, left }) => {
  menu.style.left = `${left}px`;
  menu.style.top = `${top}px`;
  menu.style.position = 'absolute'
  toggleMenu("show");
};

window.addEventListener("click", e => {
  if(menuVisible)toggleMenu("hide");

  
});

window.addEventListener("contextmenu", e => {
  e.preventDefault();
  const origin = {
    left: e.pageX,
    top: e.pageY
  };
  setPosition(origin);
  return false;
});
  
});

function isImage(i) {
  console.log(i)
  console.log(i instanceof HTMLImageElement)
    return i instanceof HTMLImageElement;
}

function saveImage() {
  console.log('deu certo')
}

