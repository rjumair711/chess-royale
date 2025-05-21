// grab the link and the main container
const rulesBtn = document.getElementById('rules-btn');
const mainSection = document.querySelector('main');

// when clicked, hide ↔ show by toggling a CSS class or the inline style
rulesBtn.addEventListener('click', function(e) {
  e.preventDefault(); // prevent the '#' jump

  // Option A: inline style toggle
  if (mainSection.style.display === 'none') {
    mainSection.style.display = '';
  } else {
    mainSection.style.display = 'none';
  }

  // — OR —

  // Option B: toggle a CSS class (recommended)
  // mainSection.classList.toggle('hidden');
});
