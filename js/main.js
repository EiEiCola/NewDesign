// Accordion functionality
function toggleMenu(menuId, button) {
    const menu = button.nextElementSibling; // not by id: several folders share the same id
    const icon = button.querySelector('.menu-icon');
    const folder = button.querySelector('.folder-icon');
    
    if (menu.classList.contains('open')) {
        menu.classList.remove('open');
        menu.style.maxHeight = '0';
        menu.style.opacity = '0';
        icon.classList.remove('rotate');
        
        if(folder && folder.classList.contains('fa-folder-open')) {
            folder.classList.remove('fa-folder-open');
            folder.classList.add('fa-folder');
        }
    } else {
        menu.classList.add('open');
        menu.style.maxHeight = '2000px'; 
        menu.style.opacity = '1';
        icon.classList.add('rotate');
        
        if(folder && folder.classList.contains('fa-folder')) {
            folder.classList.remove('fa-folder');
            folder.classList.add('fa-folder-open');
        }
    }
}

// Carousel functionality
let currentSlide = 0;
const slides = document.querySelectorAll('#pr-carousel > div');
const totalSlides = slides.length;
const carousel = document.getElementById('pr-carousel');
const dots = document.querySelectorAll('#carousel-dots button');
let autoPlayInterval;

function updateSlide() {
    carousel.style.transform = `translateX(-${currentSlide * 100}%)`;
    dots.forEach((dot, index) => {
        if (index === currentSlide) {
            dot.classList.remove('bg-white/50', 'w-1.5');
            dot.classList.add('bg-white', 'w-4');
        } else {
            dot.classList.remove('bg-white', 'w-4');
            dot.classList.add('bg-white/50', 'w-1.5');
        }
    });
}

function nextSlide() {
    currentSlide = (currentSlide + 1) % totalSlides;
    updateSlide();
}

function prevSlide() {
    currentSlide = (currentSlide - 1 + totalSlides) % totalSlides;
    updateSlide();
}

function startAutoPlay() {
    autoPlayInterval = setInterval(nextSlide, 5000);
}

function stopAutoPlay() {
    clearInterval(autoPlayInterval);
}

dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
        currentSlide = index;
        updateSlide();
    });
});

const container = document.getElementById('pr-carousel-container');
if (container) {
    container.addEventListener('mouseenter', stopAutoPlay);
    container.addEventListener('mouseleave', startAutoPlay);
    startAutoPlay();
}
