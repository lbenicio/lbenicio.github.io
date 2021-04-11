function darkmode() {
    const darkmode = parseInt(localStorage.getItem('darkmode'));
    const body = document.getElementById('body');
    if (darkmode == 1) {
        localStorage.setItem('darkmode', 0);
        body.classList.remove("darkmode");
    } else {
        localStorage.setItem('darkmode', 1);
        body.classList.add("darkmode");

    }
}

function set_dark_mode() {
    const localStorage = window.localStorage;
    const dark_mode = parseInt(localStorage.getItem('darkmode'));
    if (dark_mode == 1) {
        body.classList.add("darkmode");
    }
}