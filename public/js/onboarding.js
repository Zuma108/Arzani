/**
 * Onboarding Flow JavaScript - Business Marketplace 2025
 * Handles multi-step onboarding form with progress tracking and validation
 */

class OnboardingFlow {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 10;
        this.formData = {};
        this.isLoading = false;
        
        // Form steps configuration
        this.steps = {
            1: {
                title: "Welcome, what's your name?",
                fields: ['firstName', 'lastName'],
                validation: this.validatePersonalInfo.bind(this)
            },
            2: {
                title: "Hi {firstName}! What best describes your role?",
                subtitle: "This helps us surface the right tools and tips.",
                fields: ['userRole'],
                validation: this.validateUserRole.bind(this)
            },
            3: {
                title: "What is your company's website?",
                subtitle: "Your website helps us personalize your experience",
                fields: ['companyWebsite'],
                validation: this.validateCompanyWebsite.bind(this)
            },
            4: {
                title: "What brings you to our marketplace?",
                fields: ['businessType'],
                validation: this.validateBusinessType.bind(this)
            },
            5: {
                title: "What industry are you in?",
                subtitle: "We'll focus your experience based on your choice.",
                fields: ['industry'],
                validation: this.validateBusinessInfo.bind(this)
            },
            6: {
                title: "How big is your company?",
                subtitle: "We'll use this to recommend the best plan for your business.",
                fields: ['companySize'],
                validation: this.validateContactInfo.bind(this)
            },
            7: {
                title: "What is your company's name?",
                subtitle: "We'll use your company name to make things feel more familiar.",
                fields: ['companyName'],
                validation: this.validateCompanyName.bind(this)
            },
            8: {
                title: "Are you a human or a robot?",
                subtitle: "It's nothing personal. Some bots are incredibly deceptive nowadays.",
                fields: ['humanVerification'],
                validation: this.validateHumanVerification.bind(this)
            },
            9: {
                title: "Additional Information",
                subtitle: "Help us serve you better.",
                fields: ['additionalInfo'],
                validation: this.validateAdditionalInfo.bind(this)
            },
            10: {
                title: "Almost Done!",
                subtitle: "Just a few more details.",
                fields: ['finalDetails'],
                validation: this.validateFinalDetails.bind(this)
            }
        };
        
        // Initialize reCAPTCHA v3 when needed
        this.recaptchaLoaded = false;
        this.recaptchaToken = null;
        this.recaptchaSiteKey = window.RECAPTCHA_SITE_KEY || '6LdxYOQqAAAAAKL2G7RUKk8HoWK3zCJDsOQqUQ5I';
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.loadProgress();
        this.updateUI();
        
        // Auto-save progress every 30 seconds
        setInterval(() => {
            if (!this.isLoading) {
                this.saveProgress();
            }
        }, 30000);
    }
    
    bindEvents() {
        const form = document.getElementById('onboarding-form');
        const backBtn = document.getElementById('back-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (form) {
            form.addEventListener('submit', this.handleNext.bind(this));
        }
        
        if (backBtn) {
            backBtn.addEventListener('click', this.handleBack.bind(this));
        }
        
        // Real-time validation on input
        document.addEventListener('input', (e) => {
            if (e.target.matches('input, select, textarea')) {
                this.validateField(e.target);
                this.updateNextButton();
            }
        });
        
        // Handle radio button changes specifically
        document.addEventListener('change', (e) => {
            if (e.target.matches('input[type="radio"], input, select, textarea')) {
                this.collectFormData();
                this.saveProgress();
                this.updateNextButton();
                
                // Update visual state for radio buttons
                if (e.target.type === 'radio') {
                    if (e.target.name === 'userRole') {
                        this.updateRadioButtonStyles(e.target);
                    } else if (e.target.name === 'businessType') {
                        this.updateBusinessTypeStyles(e.target);
                    } else if (e.target.name === 'industry') {
                        this.updateIndustryStyles(e.target);
                    }
                }
            }
        });

        // Handle clicks on labels/options
        document.addEventListener('click', (e) => {
            // Handle business type option clicks
            if (e.target.closest('.business-type-option')) {
                const label = e.target.closest('.business-type-option');
                const value = label.getAttribute('data-value');
                const radio = document.getElementById(`businessType-${value}`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
            
            // Handle industry option clicks
            if (e.target.closest('.industry-option')) {
                const label = e.target.closest('.industry-option');
                const value = label.getAttribute('data-value');
                const radio = document.getElementById(`industry-${value}`);
                if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event('change', { bubbles: true }));
                }
            }
        });
        
        // Website validation on input
        document.addEventListener('input', (e) => {
            if (e.target.id === 'companyWebsite') {
                this.debounceWebsiteValidation(e.target.value);
            }
        });
        
        // Continue without website validation
        document.addEventListener('click', (e) => {
            if (e.target.id === 'continue-without-website') {
                this.continueToNextStep();
            }
        });
        
        // Debounce timer for website validation
        this.websiteValidationTimer = null;
    }
    
    async handleNext(e) {
        e.preventDefault();
        
        if (this.isLoading) return;
        
        console.log('Current step before:', this.currentStep);
        
        this.collectFormData();
        
        // Validate current step
        const currentStepConfig = this.steps[this.currentStep];
        if (currentStepConfig && !currentStepConfig.validation()) {
            console.log('Validation failed for step:', this.currentStep);
            return;
        }
        
        // Special handling for website validation step
        if (this.currentStep === 3) {
            const websiteField = document.getElementById('companyWebsite');
            if (websiteField && websiteField.value.trim()) {
                // Check if validation is still in progress
                const loadingElement = document.getElementById('website-loading');
                if (loadingElement && !loadingElement.classList.contains('hidden')) {
                    // Show message and wait a bit
                    this.showWebsiteMessage('Validating website, please wait...', 'info');
                    setTimeout(() => {
                        this.continueToNextStep();
                    }, 2000); // Wait 2 seconds to show validation result
                    return;
                }
            }
        }
        
        this.continueToNextStep();
    }
    
    async continueToNextStep() {
        this.showLoading(true);
        
        try {
            // Save progress
            await this.saveProgress();
            
            if (this.currentStep < this.totalSteps) {
                // Move to next step
                this.currentStep++;
                console.log('Current step after increment:', this.currentStep);
                this.updateStep();
            } else {
                // Complete onboarding
                await this.completeOnboarding();
            }
        } catch (error) {
            console.error('Error in handleNext:', error);
            this.showError('Something went wrong. Please try again.');
        } finally {
            this.showLoading(false);
        }
    }
    
    handleBack() {
        if (this.currentStep > 1) {
            this.currentStep--;
            this.updateStep();
        }
    }
    
    updateStep() {
        console.log('Updating step to:', this.currentStep);
        this.updateUI();
        this.updateFormFields();
        this.updateNextButton();
    }
    
    updateUI() {
        // Update step indicator
        const currentStepEl = document.getElementById('current-step');
        const totalStepsEl = document.getElementById('total-steps');
        const progressTextEl = document.querySelector('.progress-text');
        const titleEl = document.getElementById('step-title');
        const subtitleEl = document.getElementById('step-subtitle');
        const backBtn = document.getElementById('back-btn');
        const nextBtn = document.getElementById('next-btn');
        
        if (currentStepEl) currentStepEl.textContent = this.currentStep;
        if (totalStepsEl) totalStepsEl.textContent = this.totalSteps;
        if (progressTextEl) progressTextEl.textContent = `${this.currentStep} of ${this.totalSteps}`;
        
        // Update title and subtitle
        const stepConfig = this.steps[this.currentStep];
        if (titleEl && stepConfig) {
            let title = stepConfig.title;
            // Handle title interpolation
            if (title.includes('{firstName}')) {
                title = title.replace('{firstName}', this.formData.firstName || 'there');
            }
            titleEl.textContent = title;
        }
        
        if (subtitleEl && stepConfig) {
            if (stepConfig.subtitle) {
                subtitleEl.textContent = stepConfig.subtitle;
                subtitleEl.style.display = 'block';
            } else {
                subtitleEl.style.display = 'none';
            }
        }
        
        // Update buttons
        if (backBtn) {
            backBtn.disabled = this.currentStep === 1;
        }
        
        if (nextBtn) {
            const isLastStep = this.currentStep === this.totalSteps;
            // Check if there's a p element, otherwise use textContent directly
            const textElement = nextBtn.querySelector('p');
            if (textElement) {
                textElement.textContent = isLastStep ? 'Complete' : 'Next';
            } else {
                nextBtn.textContent = isLastStep ? 'Complete' : 'Next';
            }
        }
        
        // Initialize reCAPTCHA v3 for step 8
        if (this.currentStep === 8) {
            this.initializeReCaptcha();
            // Add CSS class for browsers that don't support :has()
            const formSection = document.querySelector('.form-section');
            if (formSection) {
                formSection.classList.add('recaptcha-step');
            }
        } else {
            // Remove the class when not on step 8
            const formSection = document.querySelector('.form-section');
            if (formSection) {
                formSection.classList.remove('recaptcha-step');
            }
        }
    }
    
    updateFormFields() {
        const fieldsContainer = document.getElementById('form-fields');
        if (!fieldsContainer) return;
        
        const stepConfig = this.steps[this.currentStep];
        if (!stepConfig) return;
        
        // Generate fields based on current step
        fieldsContainer.innerHTML = this.generateFieldsHTML(this.currentStep);
        
        // Restore field values
        this.restoreFieldValues();
    }
    
    generateFieldsHTML(step) {
        switch (step) {
            case 1:
                return this.generatePersonalInfoFields();
            case 2:
                return this.generateUserRoleFields();
            case 3:
                return this.generateCompanyWebsiteFields(); // Company website
            case 4:
                return this.generateMarketplaceIntentFields(); // What brings you here
            case 5:
                return this.generateBusinessInfoFields();
            case 6:
                return this.generateContactInfoFields();
            case 7:
                return this.generateCompanyNameFields();
            case 8:
                return this.generateHumanVerificationFields();
            case 9:
                return this.generateAdditionalInfoFields();
            case 10:
                return this.generateFinalDetailsFields();
            default:
                return '';
        }
    }
    
    generatePersonalInfoFields() {
        return `
            <!-- First Name Field -->
            <div class="box-border content-stretch flex flex-col gap-1.5 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full mb-6">
                <div class="box-border content-stretch flex items-start pb-0 pt-2 px-0 relative shrink-0 w-full">
                    <label class="content-stretch flex items-center relative shrink-0">
                        <div class="flex flex-col font-semibold justify-center leading-0 relative shrink-0 text-gray-800 text-sm text-nowrap">
                            <span class="leading-5 whitespace-pre">First name</span>
                        </div>
                    </label>
                </div>
                <div class="relative">
                    <input 
                        type="text" 
                        id="firstName" 
                        name="firstName"
                        class="bg-white h-10 w-80 rounded border border-gray-400 px-4 py-2 text-gray-800 font-light text-base focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                        placeholder="Enter your first name"
                        required
                    />
                    <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                </div>
            </div>
            
            <!-- Last Name Field -->
            <div class="box-border content-stretch flex flex-col gap-1.5 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <div class="box-border content-stretch flex items-start pb-0 pt-2 px-0 relative shrink-0 w-full">
                    <label class="content-stretch flex items-center relative shrink-0">
                        <div class="flex flex-col font-semibold justify-center leading-0 relative shrink-0 text-gray-800 text-sm text-nowrap">
                            <span class="leading-5 whitespace-pre">Last name</span>
                        </div>
                    </label>
                </div>
                <div class="relative">
                    <input 
                        type="text" 
                        id="lastName" 
                        name="lastName"
                        class="bg-white h-10 w-80 rounded border border-gray-400 px-4 py-2 text-gray-800 font-light text-base focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                        placeholder="Enter your last name"
                        required
                    />
                    <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                </div>
            </div>
        `;
    }
    
    generateUserRoleFields() {
        const roles = [
            { value: 'owner', label: 'Owner' },
            { value: 'executive_team', label: 'Executive Team' },
            { value: 'manager', label: 'Manager' },
            { value: 'employee', label: 'Employee' },
            { value: 'student', label: 'Student' },
            { value: 'intern', label: 'Intern' },
            { value: 'freelancer', label: 'Freelancer' },
            { value: 'other', label: 'Other' }
        ];

        const firstName = this.formData.firstName || 'Michael';
        
        return `
            <div class="box-border content-stretch flex flex-col gap-6 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <!-- Role Selection Grid -->
                <div class="max-w-4xl relative shrink-0 w-full">
                    <div class="grid grid-cols-2 gap-4 w-full">
                        ${roles.map((role, index) => `
                            <div class="relative">
                                <input type="radio" 
                                       id="role-${role.value}"
                                       name="userRole" 
                                       value="${role.value}" 
                                       class="absolute opacity-0 w-full h-full cursor-pointer z-10" 
                                       required
                                       ${this.formData.userRole === role.value ? 'checked' : ''}>
                                <label for="role-${role.value}" class="block bg-white border border-gray-400 rounded p-4 min-h-14 cursor-pointer hover:border-gray-600 hover:bg-gray-50 transition-all duration-200 user-role-option">
                                    <div class="flex items-center justify-center h-full">
                                        <span class="text-sm font-semibold text-gray-800 text-center">${role.label}</span>
                                    </div>
                                </label>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
            </div>
        `;
    }
    
    getWebsiteWithoutProtocol() {
        const website = this.formData.companyWebsite || '';
        if (website.startsWith('https://')) {
            return website.substring(8);
        } else if (website.startsWith('http://')) {
            return website.substring(7);
        }
        return website;
    }

    generateCompanyWebsiteFields() {
        return `
            <div class="box-border content-stretch flex flex-col gap-6 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <div class="text-center w-full mb-4">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">What is your company's website?</h3>
                    <p class="text-gray-600">Your website helps us personalize your experience</p>
                </div>
                
                <div class="box-border content-stretch flex flex-col gap-1.5 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                    <div class="box-border content-stretch flex items-start pb-0 pt-2 px-0 relative shrink-0 w-full">
                        <label class="content-stretch flex items-center relative shrink-0">
                            <div class="flex flex-col font-semibold justify-center leading-0 relative shrink-0 text-gray-800 text-sm text-nowrap">
                                <span class="leading-5 whitespace-pre">Company website</span>
                            </div>
                        </label>
                    </div>
                    <div class="relative w-80">
                        <div class="relative">
                            <span class="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-light text-base pointer-events-none">https://</span>
                            <input 
                                type="text" 
                                id="companyWebsite" 
                                name="companyWebsite"
                                class="bg-white h-10 w-full rounded border border-gray-400 pl-20 pr-12 py-2 text-gray-800 font-light text-base focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                                placeholder="example.com"
                                required
                                value="${this.getWebsiteWithoutProtocol()}"
                            />
                        </div>
                        <!-- Validation Status Icon -->
                        <div id="website-validation-status" class="absolute right-3 top-1/2 transform -translate-y-1/2 hidden">
                            <div id="website-loading" class="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full hidden"></div>
                            <div id="website-success" class="text-green-500 hidden">
                                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                            <div id="website-warning" class="text-yellow-500 hidden">
                                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                            <div id="website-error" class="text-red-500 hidden">
                                <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"></path>
                                </svg>
                            </div>
                        </div>
                        
                        <!-- Website Information Display -->
                        <div id="website-info" class="mt-3 p-3 bg-gray-50 rounded border hidden">
                            <div class="flex items-center gap-2 mb-2">
                                <img id="website-favicon" src="" alt="" class="w-4 h-4 hidden">
                                <span id="website-title" class="font-medium text-gray-800"></span>
                            </div>
                            <p id="website-description" class="text-sm text-gray-600"></p>
                            <div class="flex gap-4 mt-2 text-xs text-gray-500">
                                <span id="website-status"></span>
                                <span id="website-ssl"></span>
                            </div>
                        </div>
                        
                        <!-- Continue Option for Website Issues -->
                        <div id="website-continue-option" class="mt-3 p-3 bg-blue-50 border border-blue-200 rounded hidden">
                            <p class="text-blue-700 text-sm mb-2">Having trouble with website validation?</p>
                            <button 
                                type="button" 
                                id="continue-without-website"
                                class="text-blue-600 underline text-sm hover:text-blue-800"
                            >
                                Continue without website validation
                            </button>
                        </div>
                        
                        <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    generateMarketplaceIntentFields() {
        const options = [
            { value: 'seller', emoji: '💼', title: 'Sell my business', subtitle: 'List and sell your business' },
            { value: 'buyer', emoji: '🎯', title: 'Buy a business', subtitle: 'Find and acquire businesses' },
            { value: 'investor', emoji: '📈', title: 'Invest', subtitle: 'Invest in growing businesses' },
            { value: 'advisor', emoji: '🤝', title: 'Provide services', subtitle: 'Offer advisory services' }
        ];

        return `
            <div class="box-border content-stretch flex flex-col gap-1.5 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <div class="box-border content-stretch flex items-start pb-0 pt-2 px-0 relative shrink-0 w-full">
                    <label class="content-stretch flex items-center relative shrink-0">
                        <div class="flex flex-col font-semibold justify-center leading-0 relative shrink-0 text-gray-800 text-sm text-nowrap">
                            <span class="leading-5 whitespace-pre">I'm here to</span>
                        </div>
                    </label>
                </div>
                <div class="grid grid-cols-2 gap-4 w-full max-w-lg">
                    ${options.map(option => `
                        <div class="relative">
                            <input 
                                type="radio" 
                                id="businessType-${option.value}"
                                name="businessType" 
                                value="${option.value}" 
                                class="absolute opacity-0 w-full h-full cursor-pointer z-10" 
                                required
                                ${this.formData.businessType === option.value ? 'checked' : ''}
                            >
                            <label 
                                for="businessType-${option.value}" 
                                class="block p-4 border-2 border-gray-300 rounded-lg hover:border-gray-400 transition-all cursor-pointer business-type-option"
                                data-value="${option.value}"
                            >
                                <div class="text-2xl mb-2">${option.emoji}</div>
                                <div class="font-semibold text-gray-800">${option.title}</div>
                                <div class="text-sm text-gray-600 mt-1">${option.subtitle}</div>
                            </label>
                        </div>
                    `).join('')}
                </div>
                <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
            </div>
        `;
    }
    
    generateBusinessInfoFields() {
        const industries = [
            'Marketing and Advertising',
            'Technology and Services', 
            'Computer Software',
            'Real Estate',
            'Financial Services',
            'Health, Wellness and Fitness',
            'Education',
            'Consulting',
            'Retail'
        ];
        
        return `
            <div class="box-border content-stretch flex flex-col gap-6 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <div class="text-center w-full mb-4">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">What industry are you in?</h3>
                    <p class="text-gray-600">We'll focus your experience based on your choice.</p>
                </div>
                
                <div class="grid grid-cols-3 gap-4 w-full max-w-4xl">
                    ${industries.map(industry => {
                        const value = industry.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        return `
                        <div class="relative">
                            <input 
                                type="radio" 
                                id="industry-${value}"
                                name="industry" 
                                value="${value}" 
                                class="absolute opacity-0 w-full h-full cursor-pointer z-10" 
                                required
                                ${this.formData.industry === value ? 'checked' : ''}
                            >
                            <label 
                                for="industry-${value}" 
                                class="block p-4 border border-gray-400 rounded bg-white hover:border-gray-600 transition-all min-h-14 flex items-center justify-center cursor-pointer industry-option"
                                data-value="${value}"
                            >
                                <span class="text-sm font-semibold text-gray-800 text-center">${industry}</span>
                            </label>
                        </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="flex items-center gap-1 text-sm">
                    <span class="text-gray-800">Industry not listed?</span>
                    <button type="button" class="text-purple-900 font-semibold underline" onclick="alert('Search functionality coming soon!')">Search all</button>
                </div>
                
                <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
            </div>
        `;
    }
    
    generateContactInfoFields() {
        const companySizes = [
            'Just me',
            '2 to 5',
            '6 to 10',
            '11 to 25',
            '26 to 50',
            '51 to 200',
            '201 to 1,000',
            '1,001 to 10,000',
            '10,001 or more'
        ];
        
        return `
            <div class="box-border content-stretch flex flex-col gap-6 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <div class="text-center w-full mb-4">
                    <h3 class="text-2xl font-bold text-gray-800 mb-2">How big is your company?</h3>
                    <p class="text-gray-600">We'll use this to recommend the best plan for your business.</p>
                </div>
                
                <div class="grid grid-cols-3 gap-4 w-full max-w-4xl">
                    ${companySizes.map(size => {
                        const value = size.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        return `
                        <div class="relative">
                            <input 
                                type="radio" 
                                id="companySize-${value}"
                                name="companySize" 
                                value="${value}" 
                                class="absolute opacity-0 w-full h-full cursor-pointer z-10" 
                                required
                                ${this.formData.companySize === value ? 'checked' : ''}
                            >
                            <label 
                                for="companySize-${value}" 
                                class="block p-4 border border-gray-400 rounded bg-white hover:border-gray-600 transition-all min-h-14 flex items-center justify-center cursor-pointer company-size-option"
                                data-value="${value}"
                            >
                                <span class="text-sm font-semibold text-gray-800 text-center">${size}</span>
                            </label>
                        </div>
                        `;
                    }).join('')}
                </div>
                
                <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
            </div>
        `;
    }
    
    generateCompanyNameFields() {
        return `
            <div class="box-border content-stretch flex flex-col gap-1.5 items-start pb-0 pt-8 px-0 relative shrink-0 w-full">
                <div class="box-border content-stretch flex items-start pb-0 pt-2 px-0 relative shrink-0 w-full">
                    <div class="content-stretch flex items-center relative shrink-0">
                        <div class="box-border content-stretch flex flex-col items-start pl-0 pr-80 py-0 relative shrink-0">
                            <div class="flex flex-col font-semibold justify-center leading-0 relative shrink-0 text-gray-800 text-sm text-nowrap">
                                <p class="leading-5 whitespace-pre">Company name</p>
                            </div>
                        </div>
                    </div>
                </div>
                <input 
                    type="text" 
                    id="companyName" 
                    name="companyName"
                    class="bg-white h-10 rounded border border-gray-400 px-4 py-2 text-gray-800 font-light text-base w-80 focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                    placeholder="Enter your company name"
                    required
                />
                <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
            </div>
        `;
    }
    
    generateHumanVerificationFields() {
        return `
            <div class="box-border content-stretch flex flex-col gap-4 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <!-- Compact Security Verification Section -->
                <div class="w-full max-w-sm mx-auto">
                    <div class="bg-white border border-gray-300 rounded-lg p-4 shadow-sm text-center">
                        <div class="mb-3">
                            <h4 class="text-base font-semibold text-gray-800 mb-1">Human Verification</h4>
                            <p class="text-xs text-gray-600">Complete this security check to continue</p>
                        </div>
                        
                        <!-- Compact reCAPTCHA Container -->
                        <div id="recaptcha-container" class="mb-3">
                            <div class="bg-gray-50 border border-gray-200 rounded p-3 flex items-center justify-between min-h-16">
                                <div class="flex items-center flex-1">
                                    <div class="relative w-6 h-6 mr-3 flex-shrink-0">
                                        <input 
                                            type="checkbox" 
                                            id="humanVerification" 
                                            name="humanVerification"
                                            class="w-6 h-6 border-2 border-gray-400 rounded cursor-pointer focus:outline-none focus:border-blue-500 checked:bg-green-500 checked:border-green-500 transition-all"
                                            required
                                        />
                                        <div id="recaptcha-checkmark" class="absolute inset-0 w-6 h-6 bg-green-500 border-2 border-green-500 rounded flex items-center justify-center text-white hidden">
                                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
                                                <path d="M13.485 2.586a1 1 0 0 1 0 1.414L6.414 11.071a1 1 0 0 1-1.414 0L2.515 8.586a1 1 0 0 1 1.414-1.414L6.414 9.657l5.657-5.657a1 1 0 0 1 1.414 0z"/>
                                            </svg>
                                        </div>
                                    </div>
                                    <label for="humanVerification" class="text-sm text-gray-700 cursor-pointer select-none flex-1 text-left">
                                        I'm not a robot
                                    </label>
                                </div>
                                <div class="flex flex-col items-center ml-2 flex-shrink-0">
                                    <div class="w-8 h-8 bg-white rounded border flex items-center justify-center mb-1">
                                        <!-- reCAPTCHA Logo Image -->
                                        <img src="/figma design exports/icons/recaptcha.png" alt="reCAPTCHA" width="20" height="20" class="object-contain" />
                                    </div>
                                    <span class="text-xs text-gray-500 leading-tight">reCAPTCHA</span>
                                </div>
                            </div>
                        </div>
                        
                        <!-- Compact Status Messages -->
                        <div id="recaptcha-status" class="text-xs">
                            <div id="recaptcha-loading" class="flex items-center justify-center text-gray-600">
                                <div class="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600 mr-2"></div>
                                Loading verification...
                            </div>
                            <div id="recaptcha-success" class="text-green-600 hidden">
                                ✓ Verification complete
                            </div>
                            <div id="recaptcha-error" class="text-red-600 hidden">
                                Please check the box above to continue
                            </div>
                        </div>
                        
                        <!-- Privacy Links -->
                        <div class="flex justify-center gap-3 mt-2 text-xs">
                            <a href="https://policies.google.com/privacy" target="_blank" class="text-blue-600 hover:underline">Privacy</a>
                            <a href="https://policies.google.com/terms" target="_blank" class="text-blue-600 hover:underline">Terms</a>
                        </div>
                        
                        <!-- Hidden field to store reCAPTCHA token -->
                        <input type="hidden" id="recaptcha-token" name="recaptchaToken" />
                    </div>
                </div>
                
                <div class="field-error text-red-500 text-sm mt-1 hidden w-full text-center"></div>
            </div>
        `;
    }
    
    generateLocationFields() {
        return `
            <div class="box-border content-stretch flex flex-col gap-1.5 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <label class="flex flex-col font-semibold justify-center leading-0 relative shrink-0 text-gray-800 text-sm text-nowrap">
                    <span class="leading-5 whitespace-pre">Business address</span>
                </label>
                <textarea 
                    id="businessAddress" 
                    name="businessAddress"
                    rows="3"
                    class="bg-white w-80 rounded border border-gray-400 px-4 py-2 text-gray-800 font-light text-base focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 resize-none"
                    placeholder="Enter your business address"
                    required
                ></textarea>
                <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
            </div>
        `;
    }
    
    generateAdditionalInfoFields() {
        return `
            <div class="box-border content-stretch flex flex-col gap-6 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <div class="box-border content-stretch flex flex-col gap-1.5 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                    <label class="flex flex-col font-semibold justify-center leading-0 relative shrink-0 text-gray-800 text-sm text-nowrap">
                        <span class="leading-5 whitespace-pre">Tell us more about your goals</span>
                    </label>
                    <textarea 
                        id="additionalInfo" 
                        name="additionalInfo"
                        rows="4"
                        class="bg-white w-80 rounded border border-gray-400 px-4 py-2 text-gray-800 font-light text-base focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 resize-none"
                        placeholder="What are you hoping to achieve? Any specific goals or requirements you'd like us to know about?"
                    ></textarea>
                    <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                </div>
            </div>
        `;
    }
    
    generateFinalDetailsFields() {
        return `
            <div class="box-border content-stretch flex flex-col gap-6 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                <div class="box-border content-stretch flex flex-col gap-1.5 items-start pb-0 pt-0.5 px-0 relative shrink-0 w-full">
                    <label class="flex flex-col font-semibold justify-center leading-0 relative shrink-0 text-gray-800 text-sm text-nowrap">
                        <span class="leading-5 whitespace-pre">How did you hear about us?</span>
                    </label>
                    <select 
                        id="finalDetails" 
                        name="finalDetails"
                        class="bg-white h-10 w-80 rounded border border-gray-400 px-4 py-2 text-gray-800 font-light text-base focus:outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600"
                    >
                        <option value="">Select an option</option>
                        <option value="google_search">Google Search</option>
                        <option value="bing_search">Bing Search</option>
                        <option value="other_search">Other Search Engine</option>
                        <option value="facebook">Facebook</option>
                        <option value="instagram">Instagram</option>
                        <option value="linkedin">LinkedIn</option>
                        <option value="twitter">Twitter/X</option>
                        <option value="youtube">YouTube</option>
                        <option value="tiktok">TikTok</option>
                        <option value="reddit">Reddit</option>
                        <option value="social_other">Other Social Media</option>
                        <option value="friend_referral">Friend Referral</option>
                        <option value="colleague_referral">Colleague Referral</option>
                        <option value="family_referral">Family Referral</option>
                        <option value="business_referral">Business Partner Referral</option>
                        <option value="google_ads">Google Ads</option>
                        <option value="facebook_ads">Facebook Ads</option>
                        <option value="linkedin_ads">LinkedIn Ads</option>
                        <option value="display_ads">Display/Banner Ads</option>
                        <option value="tv_ads">TV Advertisement</option>
                        <option value="radio_ads">Radio Advertisement</option>
                        <option value="print_ads">Print Advertisement</option>
                        <option value="billboard">Billboard/Outdoor Ads</option>
                        <option value="blog_article">Blog Article</option>
                        <option value="newsletter">Newsletter</option>
                        <option value="podcast">Podcast</option>
                        <option value="webinar">Webinar</option>
                        <option value="whitepaper">Whitepaper/eBook</option>
                        <option value="case_study">Case Study</option>
                        <option value="video_content">Video Content</option>
                        <option value="email_marketing">Email Marketing</option>
                        <option value="cold_email">Cold Email</option>
                        <option value="conference">Conference/Trade Show</option>
                        <option value="meetup">Meetup/Networking Event</option>
                        <option value="workshop">Workshop/Seminar</option>
                        <option value="partnership">Partnership</option>
                        <option value="affiliate">Affiliate Program</option>
                        <option value="reseller">Reseller/Channel Partner</option>
                        <option value="integration">Integration Partner</option>
                        <option value="direct_website">Direct Website Visit</option>
                        <option value="word_of_mouth">Word of Mouth</option>
                        <option value="news_article">News Article</option>
                        <option value="press_release">Press Release</option>
                        <option value="review_site">Review Site</option>
                        <option value="comparison_site">Comparison/Directory Site</option>
                        <option value="industry_report">Industry Report</option>
                        <option value="other">Other</option>
                    </select>
                    <div class="field-error text-red-500 text-sm mt-1 hidden"></div>
                </div>
            </div>
        `;
    }
    
    restoreFieldValues() {
        // Restore values from formData
        Object.keys(this.formData).forEach(key => {
            const field = document.getElementById(key) || document.querySelector(`[name="${key}"]`);
            if (field) {
                if (field.type === 'radio') {
                    const radio = document.querySelector(`[name="${key}"][value="${this.formData[key]}"]`);
                    if (radio) {
                        radio.checked = true;
                        // Update appropriate styles based on radio button type
                        if (radio.name === 'userRole') {
                            this.updateRadioButtonStyles(radio);
                        } else if (radio.name === 'businessType') {
                            this.updateBusinessTypeStyles(radio);
                        } else if (radio.name === 'industry') {
                            this.updateIndustryStyles(radio);
                        }
                    }
                } else {
                    field.value = this.formData[key] || '';
                }
            }
        });
    }
    
    collectFormData() {
        const form = document.getElementById('onboarding-form');
        if (!form) return;
        
        const formData = new FormData(form);
        for (let [key, value] of formData.entries()) {
            // Special handling for company website - add https:// prefix
            if (key === 'companyWebsite' && value.trim()) {
                const cleanValue = value.trim();
                if (!cleanValue.startsWith('http://') && !cleanValue.startsWith('https://')) {
                    this.formData[key] = 'https://' + cleanValue;
                } else {
                    this.formData[key] = cleanValue;
                }
            } else {
                this.formData[key] = value;
            }
        }
    }
    
    validateField(field) {
        if (!field) {
            return true; // Field doesn't exist, consider it valid
        }
        
        const fieldContainer = field.closest('.box-border, .space-y-6 > div, .grid');
        const errorDiv = fieldContainer?.querySelector('.field-error');
        
        let isValid = true;
        let errorMessage = '';
        
        // Special handling for company website - make it optional if user has tried multiple times
        if (field.id === 'companyWebsite' && field.value.trim()) {
            // Flexible URL validation - accept with or without protocol
            const userInput = field.value.trim();
            let testUrl = userInput;
            
            // Add protocol if missing for validation
            if (!testUrl.startsWith('http://') && !testUrl.startsWith('https://')) {
                testUrl = 'https://' + testUrl;
            }
            
            // Basic URL format validation - requires domain with TLD
            const urlPattern = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}([\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i;
            if (!urlPattern.test(testUrl)) {
                isValid = false;
                errorMessage = 'Please enter a valid website URL (e.g., example.com)';
            }
        } else if (field.hasAttribute('required') && !field.value.trim()) {
            // For company website, if it's empty but has class indicating it was attempted, allow it
            if (field.id === 'companyWebsite' && field.classList.contains('validation-attempted')) {
                isValid = true; // Allow empty website after validation attempt
            } else {
                isValid = false;
                errorMessage = 'This field is required';
            }
        } else if (field.type === 'email' && field.value && !this.isValidEmail(field.value)) {
            isValid = false;
            errorMessage = 'Please enter a valid email address';
        } else if (field.type === 'tel' && field.value && !this.isValidPhone(field.value)) {
            isValid = false;
            errorMessage = 'Please enter a valid phone number';
        }
        
        if (errorDiv) {
            if (isValid) {
                errorDiv.classList.add('hidden');
                field.classList.remove('border-red-500');
                field.classList.add('border-gray-400');
            } else {
                errorDiv.textContent = errorMessage;
                errorDiv.classList.remove('hidden');
                field.classList.add('border-red-500');
                field.classList.remove('border-gray-400');
            }
        }
        
        return isValid;
    }
    
    validatePersonalInfo() {
        const firstName = document.getElementById('firstName');
        const lastName = document.getElementById('lastName');
        
        if (!firstName || !lastName) {
            return true; // Fields don't exist on current step
        }
        
        return this.validateField(firstName) && this.validateField(lastName);
    }
    
    validateUserRole() {
        const userRole = document.querySelector('[name="userRole"]:checked');
        const gridElement = document.querySelector('.grid');
        
        // If there's no grid element, this validation doesn't apply to current step
        if (!gridElement) {
            return true;
        }
        
        const errorDiv = gridElement.parentElement.querySelector('.field-error');
        
        if (!userRole) {
            if (errorDiv) {
                errorDiv.textContent = 'Please select your role';
                errorDiv.classList.remove('hidden');
            }
            return false;
        }
        
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
        return true;
    }
    
    validateCompanyWebsite() {
        const companyWebsite = document.getElementById('companyWebsite');
        if (!companyWebsite) {
            return true; // Field doesn't exist on current step
        }
        
        // Basic field validation (required check, basic format)
        const basicValidation = this.validateField(companyWebsite);
        
        // For company website, we allow users to continue even if the website
        // validation API fails. The API validation is for enhancement only.
        return basicValidation;
    }
    
    validateBusinessType() {
        const businessType = document.querySelector('[name="businessType"]:checked');
        const gridElement = document.querySelector('.grid');
        
        // If there's no grid element, this validation doesn't apply to current step
        if (!gridElement) {
            return true;
        }
        
        const errorDiv = gridElement.parentElement.querySelector('.field-error');
        
        if (!businessType) {
            if (errorDiv) {
                errorDiv.textContent = 'Please select an option';
                errorDiv.classList.remove('hidden');
            }
            return false;
        }
        
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
        return true;
    }
    
    validateBusinessInfo() {
        const industry = document.querySelector('[name="industry"]:checked');
        const gridElement = document.querySelector('.grid');
        
        // If there's no grid element, this validation doesn't apply to current step
        if (!gridElement) {
            return true;
        }
        
        const errorDiv = gridElement.parentElement.querySelector('.field-error');
        
        if (!industry) {
            if (errorDiv) {
                errorDiv.textContent = 'Please select an industry';
                errorDiv.classList.remove('hidden');
            }
            return false;
        }
        
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
        return true;
    }
    
    validateContactInfo() {
        const companySize = document.querySelector('[name="companySize"]:checked');
        const gridElement = document.querySelector('.grid');
        
        // If there's no grid element, this validation doesn't apply to current step
        if (!gridElement) {
            return true;
        }
        
        const errorDiv = gridElement.parentElement.querySelector('.field-error');
        
        if (!companySize) {
            if (errorDiv) {
                errorDiv.textContent = 'Please select your company size';
                errorDiv.classList.remove('hidden');
            }
            return false;
        }
        
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
        return true;
    }
    
    validateCompanyName() {
        const companyName = document.getElementById('companyName');
        if (!companyName) {
            return true; // Field doesn't exist on current step
        }
        
        if (!companyName.value.trim()) {
            const errorDiv = companyName.parentElement.querySelector('.field-error');
            if (errorDiv) {
                errorDiv.textContent = 'Please enter your company name';
                errorDiv.classList.remove('hidden');
            }
            return false;
        }
        
        const errorDiv = companyName.parentElement.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
        return true;
    }
    
    validateHumanVerification() {
        const humanVerification = document.getElementById('humanVerification');
        const recaptchaToken = document.getElementById('recaptcha-token');
        
        if (!humanVerification) {
            return true; // Field doesn't exist on current step
        }
        
        const errorDiv = document.querySelector('[name="humanVerification"]')?.closest('.content-stretch')?.querySelector('.field-error');
        
        // Check if checkbox is checked
        if (!humanVerification.checked) {
            if (errorDiv) {
                errorDiv.textContent = 'Please confirm you are not a robot';
                errorDiv.classList.remove('hidden');
            }
            return false;
        }
        
        // Check if reCAPTCHA token exists (allow fallback tokens)
        let tokenValue = null;
        if (recaptchaToken && recaptchaToken.value) {
            tokenValue = recaptchaToken.value;
        } else if (this.recaptchaToken) {
            tokenValue = this.recaptchaToken;
        }
        
        if (!tokenValue) {
            // Create a fallback token if none exists but checkbox is checked
            tokenValue = 'manual_verification_' + Date.now();
            if (recaptchaToken) {
                recaptchaToken.value = tokenValue;
            }
            this.recaptchaToken = tokenValue;
        }
        
        // Store reCAPTCHA token in form data
        this.formData.recaptchaToken = tokenValue;
        
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
        return true;
    }
    
    validateLocationInfo() {
        const businessAddress = document.getElementById('businessAddress');
        return this.validateField(businessAddress);
    }
    
    validateAdditionalInfo() {
        // Optional field - always returns true
        return true;
    }
    
    validateFinalDetails() {
        const finalDetails = document.getElementById('finalDetails');
        if (!finalDetails) {
            return true; // Field doesn't exist on current step
        }
        
        if (!finalDetails.value) {
            const errorDiv = finalDetails.parentElement.querySelector('.field-error');
            if (errorDiv) {
                errorDiv.textContent = 'Please select how you heard about us';
                errorDiv.classList.remove('hidden');
            }
            return false;
        }
        
        const errorDiv = finalDetails.parentElement.querySelector('.field-error');
        if (errorDiv) {
            errorDiv.classList.add('hidden');
        }
        return true;
    }
    
    debounceWebsiteValidation(url) {
        clearTimeout(this.websiteValidationTimer);
        this.websiteValidationTimer = setTimeout(() => {
            this.validateWebsite(url);
        }, 1000); // Wait 1 second after user stops typing
    }
    
    async validateWebsite(url) {
        if (!url || url.length < 8) {
            this.hideWebsiteValidation();
            return;
        }
        
        // Mark the field as validation attempted
        const websiteField = document.getElementById('companyWebsite');
        if (websiteField) {
            websiteField.classList.add('validation-attempted');
        }
        
        // Normalize URL - preserve case for domain names but normalize protocol
        let normalizedUrl = url.trim();
        if (!normalizedUrl.startsWith('http://') && !normalizedUrl.startsWith('https://')) {
            normalizedUrl = 'https://' + normalizedUrl;
        }
        
        // Basic format check before making API call
        const urlPattern = /^https?:\/\/[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.[a-zA-Z]{2,}([\w\-._~:/?#[\]@!$&'()*+,;=]*)?$/i;
        if (!urlPattern.test(normalizedUrl)) {
            this.showWebsiteError('Please enter a valid website URL (e.g., example.com)');
            return;
        }
        
        this.showWebsiteLoading();
        
        // Set a timeout to show continue option if validation takes too long
        const validationTimeout = setTimeout(() => {
            this.showWebsiteWarning('Website validation is taking longer than expected. You can continue anyway.');
        }, 5000); // Show continue option after 5 seconds
        
        try {
            const response = await fetch('/api/validate-website', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url: normalizedUrl })
            });
            
            // Clear the timeout since we got a response
            clearTimeout(validationTimeout);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                this.showWebsiteSuccess(result.data);
                // Auto-fill company name if available and not already filled
                if (result.data.companyName && !this.formData.companyName) {
                    this.formData.companyName = result.data.companyName;
                }
            } else {
                this.showWebsiteWarning(result.message || 'Website could not be verified, but you can continue.');
            }
        } catch (error) {
            // Clear the timeout since we got an error response
            clearTimeout(validationTimeout);
            console.error('Website validation error:', error);
            // Show a gentle warning but don't block the user
            this.showWebsiteWarning('Website validation is temporarily unavailable. You can continue with your setup.');
        }
    }
    
    showWebsiteLoading() {
        const statusContainer = document.getElementById('website-validation-status');
        const loading = document.getElementById('website-loading');
        const success = document.getElementById('website-success');
        const warning = document.getElementById('website-warning');
        const error = document.getElementById('website-error');
        const info = document.getElementById('website-info');
        
        if (statusContainer && loading) {
            statusContainer.classList.remove('hidden');
            loading.classList.remove('hidden');
            success.classList.add('hidden');
            warning.classList.add('hidden');
            error.classList.add('hidden');
            info.classList.add('hidden');
        }
    }
    
    showWebsiteSuccess(data) {
        const statusContainer = document.getElementById('website-validation-status');
        const loading = document.getElementById('website-loading');
        const success = document.getElementById('website-success');
        const warning = document.getElementById('website-warning');
        const error = document.getElementById('website-error');
        const info = document.getElementById('website-info');
        
        if (statusContainer && success) {
            loading.classList.add('hidden');
            success.classList.remove('hidden');
            warning.classList.add('hidden');
            error.classList.add('hidden');
            
            // Show website information
            if (info && data) {
                const favicon = document.getElementById('website-favicon');
                const title = document.getElementById('website-title');
                const description = document.getElementById('website-description');
                const status = document.getElementById('website-status');
                const ssl = document.getElementById('website-ssl');
                
                if (data.favicon && favicon) {
                    favicon.src = data.favicon;
                    favicon.classList.remove('hidden');
                }
                if (data.title && title) {
                    title.textContent = data.title;
                }
                if (data.description && description) {
                    description.textContent = data.description;
                }
                if (status) {
                    status.textContent = `Status: ${data.statusCode || 'OK'}`;
                }
                if (ssl) {
                    ssl.textContent = data.hasSSL ? '🔒 SSL Secured' : '⚠️ No SSL';
                }
                
                info.classList.remove('hidden');
            }
        }
    }
    
    showWebsiteWarning(message) {
        const statusContainer = document.getElementById('website-validation-status');
        const loading = document.getElementById('website-loading');
        const success = document.getElementById('website-success');
        const warning = document.getElementById('website-warning');
        const error = document.getElementById('website-error');
        const info = document.getElementById('website-info');
        const continueOption = document.getElementById('website-continue-option');
        
        if (statusContainer && warning) {
            statusContainer.classList.remove('hidden');
            loading.classList.add('hidden');
            success.classList.add('hidden');
            warning.classList.remove('hidden');
            error.classList.add('hidden');
            info.classList.add('hidden');
        }
        
        // Show warning message and continue option
        this.showWebsiteMessage(message, 'warning');
        if (continueOption) {
            continueOption.classList.remove('hidden');
        }
    }
    
    showWebsiteError(message) {
        const statusContainer = document.getElementById('website-validation-status');
        const loading = document.getElementById('website-loading');
        const success = document.getElementById('website-success');
        const warning = document.getElementById('website-warning');
        const error = document.getElementById('website-error');
        const info = document.getElementById('website-info');
        const continueOption = document.getElementById('website-continue-option');
        
        if (statusContainer && error) {
            statusContainer.classList.remove('hidden');
            loading.classList.add('hidden');
            success.classList.add('hidden');
            warning.classList.add('hidden');
            error.classList.remove('hidden');
            info.classList.add('hidden');
        }
        
        // Show error message and continue option
        this.showWebsiteMessage(message, 'error');
        if (continueOption) {
            continueOption.classList.remove('hidden');
        }
    }
    
    showWebsiteMessage(message, type) {
        const info = document.getElementById('website-info');
        if (info) {
            let bgClass, textClass;
            
            switch (type) {
                case 'error':
                    bgClass = 'bg-red-50 border-red-200';
                    textClass = 'text-red-700';
                    break;
                case 'warning':
                    bgClass = 'bg-yellow-50 border-yellow-200';
                    textClass = 'text-yellow-700';
                    break;
                case 'info':
                    bgClass = 'bg-blue-50 border-blue-200';
                    textClass = 'text-blue-700';
                    break;
                default:
                    bgClass = 'bg-gray-50 border-gray-200';
                    textClass = 'text-gray-700';
            }
            
            info.className = `mt-3 p-3 rounded border ${bgClass}`;
            info.innerHTML = `<p class="${textClass} text-sm">${message}</p>`;
            info.classList.remove('hidden');
        }
    }
    
    hideWebsiteValidation() {
        const statusContainer = document.getElementById('website-validation-status');
        const info = document.getElementById('website-info');
        const continueOption = document.getElementById('website-continue-option');
        
        if (statusContainer) {
            statusContainer.classList.add('hidden');
        }
        if (info) {
            info.classList.add('hidden');
        }
        if (continueOption) {
            continueOption.classList.add('hidden');
        }
    }
    
    updateRadioButtonStyles(selectedRadio) {
        // Remove selection from all radio buttons in the same group
        const radioGroup = document.querySelectorAll(`input[name="${selectedRadio.name}"]`);
        radioGroup.forEach(radio => {
            const label = document.querySelector(`label[for="${radio.id}"]`);
            if (label) {
                label.classList.remove('selected');
            }
        });
        
        // Add selection to the selected radio button
        const selectedLabel = document.querySelector(`label[for="${selectedRadio.id}"]`);
        if (selectedLabel) {
            selectedLabel.classList.add('selected');
        }
    }

    updateBusinessTypeStyles(selectedRadio) {
        // Remove selection styles from all business type options
        const allOptions = document.querySelectorAll('.business-type-option');
        allOptions.forEach(option => {
            option.classList.remove('border-gray-800', 'bg-gray-50');
            option.classList.add('border-gray-300');
        });
        
        // Add selection styles to the selected option
        const selectedLabel = document.querySelector(`label[for="${selectedRadio.id}"]`);
        if (selectedLabel) {
            selectedLabel.classList.remove('border-gray-300');
            selectedLabel.classList.add('border-gray-800', 'bg-gray-50');
        }
    }

    updateIndustryStyles(selectedRadio) {
        // Remove selection styles from all industry options
        const allOptions = document.querySelectorAll('.industry-option');
        allOptions.forEach(option => {
            option.classList.remove('border-gray-800', 'bg-gray-50');
            option.classList.add('border-gray-400');
        });
        
        // Add selection styles to the selected option
        const selectedLabel = document.querySelector(`label[for="${selectedRadio.id}"]`);
        if (selectedLabel) {
            selectedLabel.classList.remove('border-gray-400');
            selectedLabel.classList.add('border-gray-800', 'bg-gray-50');
        }
    }
    
    updateNextButton() {
        const nextBtn = document.getElementById('next-btn');
        const stepConfig = this.steps[this.currentStep];
        
        if (nextBtn && stepConfig) {
            this.collectFormData();
            const isValid = stepConfig.validation();
            nextBtn.disabled = !isValid;
        }
    }
    
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }
    
    isValidPhone(phone) {
        return /^[\+]?[1-9][\d]{0,15}$/.test(phone.replace(/[\s\-\(\)]/g, ''));
    }
    
    showLoading(show) {
        this.isLoading = show;
        const overlay = document.getElementById('loading-overlay');
        const nextBtn = document.getElementById('next-btn');
        
        if (overlay) {
            overlay.classList.toggle('hidden', !show);
        }
        
        if (nextBtn) {
            nextBtn.disabled = show;
        }
    }
    
    showError(message) {
        // Simple error display - could be enhanced with better UI
        alert(message);
    }
    
    async saveProgress() {
        try {
            const response = await fetch('/onboarding/save-progress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    currentStep: this.currentStep,
                    ...this.formData
                })
            });
            
            if (!response.ok) {
                throw new Error('Failed to save progress');
            }
        } catch (error) {
            console.error('Error saving progress:', error);
        }
    }
    
    async loadProgress() {
        try {
            const response = await fetch('/onboarding/progress');
            if (response.ok) {
                const data = await response.json();
                if (data.success && data.data) {
                    this.formData = data.data.formData || {};
                    this.currentStep = data.data.step || 1;
                }
            }
        } catch (error) {
            console.error('Error loading progress:', error);
        }
    }
    
    async completeOnboarding() {
        try {
            const response = await fetch('/onboarding/complete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Redirect to marketplace or dashboard
                window.location.href = result.redirectUrl || '/marketplace2';
            } else {
                this.showError(result.error || 'Failed to complete onboarding');
            }
        } catch (error) {
            console.error('Error completing onboarding:', error);
            this.showError('Something went wrong. Please try again.');
        }
    }
    
    // reCAPTCHA v3 Methods
    initializeReCaptcha() {
        if (!this.recaptchaLoaded) {
            this.loadReCaptchaScript();
        } else {
            this.executeReCaptcha();
        }
    }
    
    loadReCaptchaScript() {
        // Check if script already exists
        if (document.querySelector('script[src*="recaptcha"]')) {
            this.recaptchaLoaded = true;
            // Add small delay to ensure grecaptcha is ready
            setTimeout(() => {
                this.executeReCaptcha();
            }, 500);
            return;
        }
        
        const script = document.createElement('script');
        script.src = `https://www.google.com/recaptcha/enterprise.js?render=${this.recaptchaSiteKey}`;
        script.onload = () => {
            this.recaptchaLoaded = true;
            // Add small delay to ensure grecaptcha is ready
            setTimeout(() => {
                this.executeReCaptcha();
            }, 500);
        };
        script.onerror = () => {
            console.warn('Failed to load reCAPTCHA Enterprise script, using fallback');
            this.handleReCaptchaFallback();
        };
        document.head.appendChild(script);
    }
    
    executeReCaptcha() {
        if (typeof grecaptcha === 'undefined') {
            console.warn('reCAPTCHA Enterprise not loaded, using fallback verification');
            this.handleReCaptchaFallback();
            return;
        }
        
        grecaptcha.enterprise.ready(async () => {
            try {
                const token = await grecaptcha.enterprise.execute(this.recaptchaSiteKey, { action: 'ONBOARDING' });
                this.recaptchaToken = token;
                this.showReCaptchaSuccess();
                
                // Store token in hidden field
                const tokenField = document.getElementById('recaptcha-token');
                if (tokenField) {
                    tokenField.value = token;
                }
                
                // Auto-check the checkbox
                const checkbox = document.getElementById('humanVerification');
                if (checkbox) {
                    checkbox.checked = true;
                    this.showCheckmark();
                }
                
                console.log('reCAPTCHA Enterprise token generated successfully');
            } catch (error) {
                console.warn('reCAPTCHA Enterprise execution error, using fallback:', error);
                this.handleReCaptchaFallback();
            }
        });
    }
    
    handleReCaptchaFallback() {
        // Fallback: Allow manual checkbox verification
        this.showReCaptchaFallback();
        
        // Enable manual checkbox interaction
        const checkbox = document.getElementById('humanVerification');
        if (checkbox) {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.showCheckmark();
                    this.showReCaptchaSuccess();
                    
                    // Set a fallback token to indicate manual verification
                    const tokenField = document.getElementById('recaptcha-token');
                    if (tokenField) {
                        tokenField.value = 'manual_verification_' + Date.now();
                    }
                } else {
                    this.hideCheckmark();
                    this.showReCaptchaError('Please confirm you are not a robot');
                }
            });
        }
    }
    
    showReCaptchaSuccess() {
        const loadingEl = document.getElementById('recaptcha-loading');
        const successEl = document.getElementById('recaptcha-success');
        const errorEl = document.getElementById('recaptcha-error');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (errorEl) errorEl.style.display = 'none';
        if (successEl) successEl.style.display = 'block';
    }
    
    showReCaptchaError(message) {
        const loadingEl = document.getElementById('recaptcha-loading');
        const successEl = document.getElementById('recaptcha-success');
        const errorEl = document.getElementById('recaptcha-error');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.textContent = message || 'reCAPTCHA Enterprise verification failed. Please try again.';
        }
        
        // Reset checkbox
        const checkbox = document.getElementById('humanVerification');
        if (checkbox) {
            checkbox.checked = false;
        }
        this.hideCheckmark();
    }
    
    showReCaptchaFallback() {
        const loadingEl = document.getElementById('recaptcha-loading');
        const successEl = document.getElementById('recaptcha-success');
        const errorEl = document.getElementById('recaptcha-error');
        
        if (loadingEl) loadingEl.style.display = 'none';
        if (successEl) successEl.style.display = 'none';
        if (errorEl) {
            errorEl.style.display = 'block';
            errorEl.className = 'text-orange-600 text-xs';
            errorEl.textContent = 'Please manually verify by checking the box above';
        }
    }
    
    showCheckmark() {
        const checkbox = document.getElementById('humanVerification');
        const checkmark = document.getElementById('recaptcha-checkmark');
        
        if (checkbox && checkmark) {
            checkbox.style.display = 'none';
            checkmark.style.display = 'flex';
        }
    }
    
    hideCheckmark() {
        const checkbox = document.getElementById('humanVerification');
        const checkmark = document.getElementById('recaptcha-checkmark');
        
        if (checkbox && checkmark) {
            checkbox.style.display = 'block';
            checkmark.style.display = 'none';
        }
    }
}

// Initialize onboarding flow when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OnboardingFlow();
});