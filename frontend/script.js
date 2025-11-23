// Modal Management
const loginModal = document.getElementById('loginModal');
const dashboardModal = document.getElementById('dashboardModal');
const loginBtn = document.getElementById('loginBtn');
const dashboardBtn = document.getElementById('dashboardBtn');
const closeModal = document.getElementById('closeModal');
const closeDashboard = document.getElementById('closeDashboard');
const modalOverlay = document.getElementById('modalOverlay');
const dashboardOverlay = document.getElementById('dashboardOverlay');
const loginForm = document.getElementById('loginForm');

// File Upload Management
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const uploadContent = uploadArea.querySelector('.upload-content');
const uploadPreview = document.getElementById('uploadPreview');
const removeBtn = document.getElementById('removeBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');

let uploadedFile = null;

// Open Login Modal
loginBtn.addEventListener('click', () => {
    loginModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Close Login Modal
closeModal.addEventListener('click', () => {
    loginModal.classList.remove('active');
    document.body.style.overflow = 'auto';
});

modalOverlay.addEventListener('click', () => {
    loginModal.classList.remove('active');
    document.body.style.overflow = 'auto';
});

// Open Dashboard Modal
dashboardBtn.addEventListener('click', () => {
    dashboardModal.classList.add('active');
    document.body.style.overflow = 'hidden';
});

// Close Dashboard Modal
closeDashboard.addEventListener('click', () => {
    dashboardModal.classList.remove('active');
    document.body.style.overflow = 'auto';
});

dashboardOverlay.addEventListener('click', () => {
    dashboardModal.classList.remove('active');
    document.body.style.overflow = 'auto';
});

// Login Form Submission
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const remember = document.getElementById('remember').checked;
    
    // Simulate login (in production, this would be an API call)
    console.log('Login attempt:', { email, remember });
    
    // Show success message
    alert('Login successful! Welcome back.');
    
    // Close modal
    loginModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    
    // Reset form
    loginForm.reset();
});

// Browse Button Click
browseBtn.addEventListener('click', () => {
    fileInput.click();
});

// Upload Area Click
uploadArea.addEventListener('click', (e) => {
    if (!uploadPreview.style.display || uploadPreview.style.display === 'none') {
        fileInput.click();
    }
});

// Drag and Drop Events
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('drag-over');
});

uploadArea.addEventListener('dragleave', () => {
    uploadArea.classList.remove('drag-over');
});

uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        handleFileSelect(files[0]);
    }
});

// File Input Change
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Handle File Selection
function handleFileSelect(file) {
    // Validate file type
    const validTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!validTypes.includes(file.type)) {
        alert('Please upload a PDF, DOC, or DOCX file.');
        return;
    }
    
    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
        alert('File size must be less than 10MB.');
        return;
    }
    
    uploadedFile = file;
    
    // Update file info
    fileName.textContent = file.name;
    fileSize.textContent = formatFileSize(file.size);
    
    // Show preview, hide upload content
    uploadContent.style.display = 'none';
    uploadPreview.style.display = 'block';
    
    // Add success animation
    uploadArea.style.borderColor = '#10b981';
    setTimeout(() => {
        uploadArea.style.borderColor = '';
    }, 1000);
}

// Format File Size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Remove File
removeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    uploadedFile = null;
    fileInput.value = '';
    
    // Hide preview, show upload content
    uploadPreview.style.display = 'none';
    uploadContent.style.display = 'block';
});

// Analyze Resume
analyzeBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (!uploadedFile) {
        alert('Please upload a resume first.');
        return;
    }
    
    // Show analyzing animation
    analyzeBtn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" style="animation: spin 1s linear infinite;">
            <path d="M10 2V6M10 14V18M18 10H14M6 10H2M15.657 4.343L13.828 6.172M6.172 13.828L4.343 15.657M15.657 15.657L13.828 13.828M6.172 6.172L4.343 4.343" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
        Analyzing...
    `;
    analyzeBtn.disabled = true;
    
    // Simulate AI analysis (in production, this would be an API call)
    setTimeout(() => {
        // Show results
        alert('Analysis Complete!\n\nYour Resume Score: 8.7/10\n\nStrengths:\n✓ Clear formatting\n✓ Good keyword usage\n✓ Relevant experience\n\nSuggestions:\n• Add more quantifiable achievements\n• Include technical skills section\n• Optimize for ATS keywords');
        
        // Reset button
        analyzeBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10 2L12.5 7L18 8L14 12L15 18L10 15L5 18L6 12L2 8L7.5 7L10 2Z" fill="currentColor"/>
            </svg>
            Analyze with AI
        `;
        analyzeBtn.disabled = false;
    }, 2500);
});

// Smooth Scrolling for Navigation Links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
            const headerOffset = 100;
            const elementPosition = targetElement.getBoundingClientRect().top;
            const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
            
            window.scrollTo({
                top: offsetPosition,
                behavior: 'smooth'
            });
        }
    });
});

// Add CSS for spinning animation
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from {
            transform: rotate(0deg);
        }
        to {
            transform: rotate(360deg);
        }
    }
`;
document.head.appendChild(style);

// Scroll to Upload Section when page loads (optional)
window.addEventListener('load', () => {
    console.log('AI Resume Optimizer loaded successfully!');
});

// Add intersection observer for animation on scroll
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe feature cards
document.querySelectorAll('.feature-card').forEach(card => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(card);
});

// Keyboard Shortcuts
document.addEventListener('keydown', (e) => {
    // Escape to close modals
    if (e.key === 'Escape') {
        if (loginModal.classList.contains('active')) {
            loginModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
        if (dashboardModal.classList.contains('active')) {
            dashboardModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    }
});

// Prevent default drag behavior on document
document.addEventListener('dragover', (e) => {
    e.preventDefault();
});

document.addEventListener('drop', (e) => {
    e.preventDefault();
});

console.log('✨ Welcome to AI Resume Optimizer!');
console.log('💼 Upload your resume and let AI transform your career.');
