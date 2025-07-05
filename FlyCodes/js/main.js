/**
 * FlyCodes.com - Main JavaScript
 * 
 * This file handles all the interactive elements of the landing page
 */

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Initialize Bootstrap tooltips
    var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    // Initialize SimpleLightbox for portfolio images
    new SimpleLightbox('.portfolio-item a', {
        captions: true,
        captionDelay: 250
    });

    // Back to top button functionality
    const backToTopButton = document.querySelector('.back-to-top');
    if (backToTopButton) {
        window.addEventListener('scroll', () => {
            if (window.pageYOffset > 100) {
                backToTopButton.classList.add('active');
            } else {
                backToTopButton.classList.remove('active');
            }
        });

        backToTopButton.addEventListener('click', function(e) {
            e.preventDefault();
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Smooth scrolling for all links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Form validation and submission
    const contactForm = document.getElementById('contactForm');
    
    if (contactForm) {
        // Add CSRF token to form if it exists in the page
        const csrfToken = document.querySelector('meta[name="csrf-token"]');
        if (csrfToken) {
            const csrfInput = document.createElement('input');
            csrfInput.type = 'hidden';
            csrfInput.name = 'csrf_token';
            csrfInput.value = csrfToken.getAttribute('content');
            contactForm.appendChild(csrfInput);
        }
        
        // Client-side validation function
        function validateForm() {
            const name = contactForm.querySelector('#name').value.trim();
            const email = contactForm.querySelector('#email').value.trim();
            const subject = contactForm.querySelector('#subject').value.trim();
            const message = contactForm.querySelector('#message').value.trim();
            
            // Basic validation
            if (name.length < 2) {
                showError('Please enter a valid name (at least 2 characters)');
                return false;
            }
            
            if (!isValidEmail(email)) {
                showError('Please enter a valid email address');
                return false;
            }
            
            if (subject.length < 2) {
                showError('Please enter a valid subject (at least 2 characters)');
                return false;
            }
            
            if (message.length < 10) {
                showError('Please enter a message (at least 10 characters)');
                return false;
            }
            
            return true;
        }
        
        // Email validation helper
        function isValidEmail(email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return emailRegex.test(email);
        }
        
        // Show error message
        function showError(message) {
            // Remove any existing error alerts
            const existingAlerts = document.querySelectorAll('.alert-danger');
            existingAlerts.forEach(alert => alert.remove());
            
            // Create error message
            const alertDiv = document.createElement('div');
            alertDiv.className = 'alert alert-danger mt-3';
            alertDiv.innerHTML = `
                <div class="d-flex align-items-center">
                    <i class="fas fa-exclamation-circle text-danger me-2"></i>
                    <div>${message}</div>
                </div>
            `;
            
            // Insert alert before the form
            contactForm.parentNode.insertBefore(alertDiv, contactForm);
            
            // Scroll to alert
            alertDiv.scrollIntoView({ behavior: 'smooth' });
            
            // Remove alert after 5 seconds
            setTimeout(() => {
                alertDiv.remove();
            }, 5000);
        }
        
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Validate form before submission
            if (!validateForm()) {
                return;
            }
            
            // Get form data
            const formData = new FormData(contactForm);
            
            // Show loading state
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalButtonText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Sending...';
            submitButton.disabled = true;
            
            // Send AJAX request with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            fetch('process_form.php', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            })
            .then(response => {
                clearTimeout(timeoutId);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Create success message
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert alert-success mt-3';
                alertDiv.innerHTML = `
                    <div class="d-flex align-items-center">
                        <i class="fas fa-check-circle text-success me-2"></i>
                        <div>
                            <strong>Thank you!</strong> We've received your message and will get back to you shortly.
                        </div>
                    </div>
                `;
                
                // Insert alert after the form
                contactForm.parentNode.insertBefore(alertDiv, contactForm.nextSibling);
                
                // Reset form
                contactForm.reset();
                
                // Scroll to alert
                alertDiv.scrollIntoView({ behavior: 'smooth' });
                
                // Remove alert after 5 seconds
                setTimeout(() => {
                    alertDiv.remove();
                }, 5000);
            })
            .catch(error => {
                clearTimeout(timeoutId);
                console.error('Error:', error);
                showError('There was a problem sending your message. Please try again later.');
            })
            .finally(() => {
                // Reset button state
                submitButton.innerHTML = originalButtonText;
                submitButton.disabled = false;
            });
        });
    }

    // Navbar scroll behavior
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', function() {
            if (window.pageYOffset > 50) {
                navbar.classList.add('navbar-scrolled');
            } else {
                navbar.classList.remove('navbar-scrolled');
            }
        });
    }

    // Testimonial carousel auto-play
    const testimonialCarousel = document.getElementById('testimonialCarousel');
    if (testimonialCarousel) {
        new bootstrap.Carousel(testimonialCarousel, {
            interval: 5000,
            wrap: true
        });
    }

    // Initialize AOS (Animate On Scroll)
    AOS.init({
        duration: 800,
        easing: 'ease-in-out',
        once: true
    });

    // Exit intent popup
    let hasShownPopup = false;
    document.addEventListener('mouseout', function(e) {
        if (!hasShownPopup && e.clientY <= 0) {
            hasShownPopup = true;
            showExitPopup();
        }
    });

    function showExitPopup() {
        const popup = document.createElement('div');
        popup.className = 'exit-popup';
        popup.innerHTML = `
            <div class="exit-popup-content">
                <button class="close-popup">&times;</button>
                <h3>Wait! Don't Miss This Opportunity</h3>
                <p>Get your professional website for just $50 today!</p>
                <a href="#contact" class="btn btn-primary btn-lg w-100">Get Started Now</a>
                <p class="mt-2 small">Limited time offer. No credit card required.</p>
            </div>
        `;
        document.body.appendChild(popup);
        
        // Close popup functionality
        popup.querySelector('.close-popup').addEventListener('click', function() {
            popup.remove();
        });
    }

    // Add scroll-based animations for pricing cards
    const pricingCards = document.querySelectorAll('.pricing-card');
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate__animated', 'animate__fadeInUp');
            }
        });
    }, { threshold: 0.1 });

    pricingCards.forEach(card => observer.observe(card));

    // Cookie Consent Banner
    if (!localStorage.getItem('cookiesAccepted')) {
        // Show cookie consent banner
        const cookieBanner = document.getElementById('cookieConsent');
        if (cookieBanner) {
            cookieBanner.style.display = 'block';
            
            // Accept cookies button
            const acceptButton = document.getElementById('acceptCookies');
            if (acceptButton) {
                acceptButton.addEventListener('click', function() {
                    localStorage.setItem('cookiesAccepted', 'true');
                    cookieBanner.style.display = 'none';
                });
            }
            
            // Decline cookies button
            const declineButton = document.getElementById('declineCookies');
            if (declineButton) {
                declineButton.addEventListener('click', function() {
                    localStorage.setItem('cookiesAccepted', 'false');
                    cookieBanner.style.display = 'none';
                });
            }
        }
    }

    // Performance Monitoring
    const performanceMetrics = {
        init() {
            this.measurePageLoad();
            this.measureFirstContentfulPaint();
            this.measureLargestContentfulPaint();
            this.measureCumulativeLayoutShift();
            this.measureFirstInputDelay();
            this.measureTimeToInteractive();
        },

        measurePageLoad() {
            window.addEventListener('load', () => {
                const timing = performance.timing;
                const pageLoadTime = timing.loadEventEnd - timing.navigationStart;
                console.log(`Page Load Time: ${pageLoadTime}ms`);
                this.sendMetric('pageLoad', pageLoadTime);
            });
        },

        measureFirstContentfulPaint() {
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const fcp = entries[entries.length - 1];
                console.log(`First Contentful Paint: ${fcp.startTime}ms`);
                this.sendMetric('fcp', fcp.startTime);
            }).observe({ entryTypes: ['paint'] });
        },

        measureLargestContentfulPaint() {
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const lcp = entries[entries.length - 1];
                console.log(`Largest Contentful Paint: ${lcp.startTime}ms`);
                this.sendMetric('lcp', lcp.startTime);
            }).observe({ entryTypes: ['largest-contentful-paint'] });
        },

        measureCumulativeLayoutShift() {
            let cumulativeScore = 0;
            new PerformanceObserver((entryList) => {
                for (const entry of entryList.getEntries()) {
                    cumulativeScore += entry.value;
                }
                console.log(`Cumulative Layout Shift: ${cumulativeScore}`);
                this.sendMetric('cls', cumulativeScore);
            }).observe({ entryTypes: ['layout-shift'] });
        },

        measureFirstInputDelay() {
            new PerformanceObserver((entryList) => {
                const entries = entryList.getEntries();
                const fid = entries[entries.length - 1];
                console.log(`First Input Delay: ${fid.processingStart - fid.startTime}ms`);
                this.sendMetric('fid', fid.processingStart - fid.startTime);
            }).observe({ entryTypes: ['first-input'] });
        },

        measureTimeToInteractive() {
            const tti = performance.now();
            console.log(`Time to Interactive: ${tti}ms`);
            this.sendMetric('tti', tti);
        },

        sendMetric(name, value) {
            // Send metrics to your analytics service
            if (typeof gtag === 'function') {
                gtag('event', 'performance', {
                    'metric_name': name,
                    'value': value
                });
            }
        }
    };

    // Initialize performance monitoring
    performanceMetrics.init();
});

/**
 * Change navbar background on scroll
 */
function initNavbarScroll() {
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 50) {
            navbar.classList.add('navbar-scrolled');
        } else {
            navbar.classList.remove('navbar-scrolled');
        }
    });
}

/**
 * Initialize Simple Lightbox for portfolio items
 */
function initPortfolioLightbox() {
    new SimpleLightbox('.portfolio-gallery a', {
        captions: true,
        captionDelay: 250
    });
}

/**
 * Show/hide back to top button based on scroll position
 */
function initBackToTop() {
    const backToTopButton = document.querySelector('.back-to-top');
    
    window.addEventListener('scroll', function() {
        if (window.scrollY > 300) {
            backToTopButton.classList.add('active');
        } else {
            backToTopButton.classList.remove('active');
        }
    });
    
    backToTopButton.addEventListener('click', function(e) {
        e.preventDefault();
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
}

/**
 * Smooth scrolling for anchor links
 */
function initSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Get the target element
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                // Calculate position to scroll to (with navbar offset)
                const navbarHeight = document.querySelector('.navbar').offsetHeight;
                const targetPosition = targetElement.getBoundingClientRect().top + window.pageYOffset - navbarHeight;
                
                // Smooth scroll to target
                window.scrollTo({
                    top: targetPosition,
                    behavior: 'smooth'
                });
                
                // If mobile menu is open, close it
                const navbarToggler = document.querySelector('.navbar-toggler');
                const navbarCollapse = document.querySelector('.navbar-collapse');
                if (navbarCollapse.classList.contains('show')) {
                    navbarToggler.click();
                }
            }
        });
    });
}
