window.onscroll = function() {scrollFunction()};

function scrollFunction() {
  var thr = 800;
  if (document.body.scrollTop > thr || document.documentElement.scrollTop > thr) {
    document.getElementById("top-scrl-btn").style.display = "block";
  } else {
    document.getElementById("top-scrl-btn").style.display = "none";
  }
}

function scrollToTopFunction() {
  document.body.scrollTop = 0; // For Safari
  document.documentElement.scrollTop = 0; // For Chrome, Firefox, IE and Opera
}
