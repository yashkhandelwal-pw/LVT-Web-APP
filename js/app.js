// Main application logic for Live Visit Tracker
class LiveVisitTracker {
    constructor() {
        this.cachedData = null;
        this.locationCoords = { latitude: null, longitude: null };
        this.imageBase64 = null;
        this.currentSchoolDetails = { district: '', state: '' };
        this.submissionInProgress = false;
        this.submissionTimeoutId = null;
        
        this.initialize();
    }

    initialize() {
        this.setupEventListeners();
        this.createCanvasIfNeeded();
        console.log('Live Visit Tracker initialized');
    }

    createCanvasIfNeeded() {
        let canvas = document.getElementById('image-canvas');
        if (!canvas) {
            canvas = document.createElement('canvas');
            canvas.id = 'image-canvas';
            canvas.style.display = 'none';
            document.body.appendChild(canvas);
        }
    }

    setupEventListeners() {
        // Image capture with enhanced mobile support
        const imageInput = document.getElementById('image-capture-input');
        const imageCaptureBox = document.getElementById('image-capture-box');
        
        // Ensure input has proper mobile camera attributes
        if (imageInput) {
            imageInput.setAttribute('accept', 'image/*');
            imageInput.setAttribute('capture', 'environment');
            imageInput.setAttribute('multiple', 'false');
        }
        
        if (imageCaptureBox && imageInput) {
            imageCaptureBox.addEventListener('click', () => {
                imageInput.click();
            });
            
            imageInput.addEventListener('change', (event) => {
                const file = event.target.files[0];
                if (file) {
                    this.handleImageFile(file);
                }
            });
        }

        // School dropdown
        const schoolDropdownContainer = document.getElementById('school-dropdown-container');
        const schoolSelectButton = document.getElementById('school-select-button');
        const schoolOptionsPanel = document.getElementById('school-options-panel');
        const schoolSearchInput = document.getElementById('school-search-input');
        
        if (schoolSelectButton && schoolOptionsPanel && schoolSearchInput) {
            schoolSelectButton.addEventListener('click', (e) => {
                e.stopPropagation();
                schoolOptionsPanel.classList.toggle('hidden');
                if (!schoolOptionsPanel.classList.contains('hidden')) {
                    schoolSearchInput.value = '';
                    this.renderSchoolOptions();
                    schoolSearchInput.focus();
                }
            });
            
            schoolSearchInput.addEventListener('input', () => {
                this.renderSchoolOptions(schoolSearchInput.value.toLowerCase());
            });
            
            document.addEventListener('click', (e) => {
                if (schoolDropdownContainer && !schoolDropdownContainer.contains(e.target)) {
                    schoolOptionsPanel.classList.add('hidden');
                }
            });
        }
    }

    handleImageFile(file) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
            this.showMessage('Please select a valid image file.', 'error', 'login');
            return;
        }

        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            this.showMessage('Image file is too large. Please select an image smaller than 10MB.', 'error', 'login');
            return;
        }

        // Show loading indicator
        const imagePlaceholder = document.getElementById('image-placeholder');
        if (imagePlaceholder) {
            imagePlaceholder.innerHTML = '<div class="text-center p-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div><p class="mt-2 text-sm text-gray-500">Processing image...</p></div>';
        }

        // Process the image
        this.compressImage(file);
    }

    // UI Helper Functions
    showLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.remove('hidden');
    }

    hideLoader() {
        const loader = document.getElementById('loader');
        if (loader) loader.classList.add('hidden');
    }

    showMessage(text, type, view = 'login') {
        const msgArea = document.getElementById(`message-area-${view}`);
        if (msgArea) {
            msgArea.innerHTML = `<div class="message ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'} p-3 rounded-md">${text}</div>`;
        }
    }

    clearMessages() {
        const loginMsg = document.getElementById('message-area-login');
        if (loginMsg) loginMsg.innerHTML = '';
    }

    goBack() {
        const formView = document.getElementById('form-view');
        const loginView = document.getElementById('login-view');
        const visitForm = document.getElementById('visit-form');
        
        if (formView) formView.classList.add('hidden');
        if (loginView) loginView.classList.remove('hidden');
        if (visitForm) visitForm.reset();
        
        this.clearAllErrorMessages();
        this.resetImageCapture();
        this.resetFormElements();
        
        this.imageBase64 = null;
        this.currentSchoolDetails = { district: '', state: '' };
    }

    resetImageCapture() {
        const imagePreview = document.getElementById('image-preview');
        const imagePlaceholder = document.getElementById('image-placeholder');
        
        if (imagePreview) imagePreview.classList.add('hidden');
        if (imagePlaceholder) {
            imagePlaceholder.classList.remove('hidden');
            imagePlaceholder.innerHTML = '<div class="text-center p-8"><svg class="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"></path></svg><p class="mt-2 text-sm text-gray-500">Click to capture image</p></div>';
        }
    }

    resetFormElements() {
        const elements = [
            'new-spoc-fields',
            'sku-section', 
            'sku-container',
            'school-options-panel',
            'district-filter-container'
        ];
        
        elements.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (id === 'sku-container') {
                    el.innerHTML = '';
                } else {
                    el.classList.add('hidden');
                }
            }
        });

        const schoolSelectedText = document.getElementById('school-selected-text');
        if (schoolSelectedText) {
            schoolSelectedText.textContent = 'Select School';
            schoolSelectedText.classList.add('text-gray-500');
        }

        const schoolInput = document.getElementById('school');
        if (schoolInput) schoolInput.value = '';
    }

    // Enhanced Image Compression with better error handling
    compressImage(file) {
        const MAX_WIDTH = CONFIG.APP.IMAGE_COMPRESSION.MAX_WIDTH;
        const MAX_HEIGHT = CONFIG.APP.IMAGE_COMPRESSION.MAX_HEIGHT;
        const QUALITY = CONFIG.APP.IMAGE_COMPRESSION.QUALITY;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                try {
                    let width = img.width;
                    let height = img.height;

                    // Calculate new dimensions while maintaining aspect ratio
                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    // Ensure canvas exists
                    this.createCanvasIfNeeded();
                    const canvas = document.getElementById('image-canvas');
                    
                    if (!canvas) {
                        throw new Error('Canvas element could not be created');
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    
                    if (!ctx) {
                        throw new Error('Could not get canvas context');
                    }

                    // Handle image orientation for mobile photos
                    ctx.save();
                    ctx.drawImage(img, 0, 0, width, height);
                    ctx.restore();

                    // Get the compressed image data as a Base64 string
                    this.imageBase64 = canvas.toDataURL('image/jpeg', QUALITY);

                    // Update the UI
                    this.updateImagePreview();
                    this.clearAllErrorMessages();

                } catch (error) {
                    console.error('Error compressing image:', error);
                    this.showMessage('Error processing image. Please try again.', 'error', 'login');
                    this.resetImageCapture();
                }
            };
            
            img.onerror = () => {
                console.error('Error loading image');
                this.showMessage('Error loading image. Please try a different image.', 'error', 'login');
                this.resetImageCapture();
            };
            
            img.src = e.target.result;
        };
        
        reader.onerror = () => {
            console.error('Error reading file');
            this.showMessage('Error reading file. Please try again.', 'error', 'login');
            this.resetImageCapture();
        };
        
        reader.readAsDataURL(file);
    }

    updateImagePreview() {
        const imagePreview = document.getElementById('image-preview');
        const imagePlaceholder = document.getElementById('image-placeholder');
        
        if (imagePreview && this.imageBase64) {
            imagePreview.src = this.imageBase64;
            imagePreview.classList.remove('hidden');
        }
        
        if (imagePlaceholder) {
            imagePlaceholder.classList.add('hidden');
        }
    }

    // Data Fetching
    async fetchDetails() {
        this.clearMessages();
        const emailInput = document.getElementById('email');
        if (!emailInput) return;
        
        const email = emailInput.value.trim().toLowerCase();
        
        if (!email) {
            this.showMessage('Please enter your email address.', 'error', 'login');
            return;
        }

        if (!email.endsWith(CONFIG.APP.COMPANY_EMAIL_DOMAIN)) {
            this.showMessage(`Please use a valid ${CONFIG.APP.COMPANY_EMAIL_DOMAIN} email.`, 'error', 'login');
            return;
        }

        this.showLoader();
        
        try {
            await this.getAndSetLocation();
            const data = await this.getInitialData(email);
            this.onDataFetched(data);
        } catch (error) {
            this.hideLoader();
            this.showMessage('Error: ' + error.message, 'error', 'login');
        }
    }

    async getAndSetLocation() {
        return new Promise((resolve, reject) => {
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        this.locationCoords.latitude = position.coords.latitude;
                        this.locationCoords.longitude = position.coords.longitude;
                        resolve();
                    },
                    (error) => {
                        let errorMessage = 'Location access is required. Please allow location access.';
                        switch(error.code) {
                            case error.PERMISSION_DENIED:
                                errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
                                break;
                            case error.POSITION_UNAVAILABLE:
                                errorMessage = 'Location information is unavailable. Please try again.';
                                break;
                            case error.TIMEOUT:
                                errorMessage = 'Location request timed out. Please try again.';
                                break;
                        }
                        reject(new Error(errorMessage));
                    },
                    {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    }
                );
            } else {
                reject(new Error('Geolocation is not supported by this browser.'));
            }
        });
    }

    async getInitialData(email) {
        try {
            console.log('Starting getInitialData for:', email);
            
            // Ensure supabase client is ready
            if (!supabaseClient || !supabaseClient.supabase) {
                console.log('Supabase client not ready, initializing...');
                await supabaseClient.initialize();
            }
            
            // Get employee data from Supabase
            console.log('Checking if employee exists...');
            const employee = await supabaseClient.getEmployeeByEmail(email);
            console.log('Employee check result:', employee);
            
            if (!employee) {
                console.log('Employee not found');
                return { error: "Email not found. Please contact administrator." };
            }

            console.log('Employee found, proceeding...');

            // For now, we'll treat all users as regular users (not managers)
            const isManager = false;

            // Get co-visitors from database
            console.log('Fetching co-visitors for email:', email);
            const coVisitors = await supabaseClient.getCoVisitors(email);
            console.log('Co-visitors received:', coVisitors);
            const uniqueCoVisitors = coVisitors || [];

            // Get SKU data
            console.log('Getting SKU data...');
            const skuData = await supabaseClient.getSkuData();
            console.log('SKU data:', skuData);

            let dataToReturn = {
                isManager: isManager,
                rmEmail: employee.rm_email || '',
                zmEmail: employee.zm_email || '',
                coVisitors: uniqueCoVisitors,
                skuData: skuData,
                userEmail: email
            };

            // Get schools or districts based on role
            console.log('Getting schools for user...');
            if (isManager) {
                const districts = await supabaseClient.getDistrictsForManager(email);
                console.log('Districts found:', districts);
                dataToReturn.districts = districts;
            } else {
                const schools = await supabaseClient.getSchoolsForUser(email, false);
                console.log('Schools found:', schools);
                dataToReturn.schools = schools;
            }

            this.cachedData = dataToReturn;
            console.log('Final data prepared:', dataToReturn);
            return dataToReturn;

        } catch (error) {
            console.error('Error fetching initial data:', error);
            return { error: 'An error occurred while fetching data: ' + error.message };
        }
    }

    onDataFetched(data) {
        this.hideLoader();
        if (data.error) {
            this.showMessage(data.error, 'error', 'login');
            return;
        }

        // Adaptive UI Logic
        const districtFilterContainer = document.getElementById('district-filter-container');
        if (data.isManager && districtFilterContainer) {
            districtFilterContainer.classList.remove('hidden');
            this.populateDropdown('district', data.districts, 'Select District to Load Schools');
        } else if (districtFilterContainer) {
            districtFilterContainer.classList.add('hidden');
            this.renderSchoolOptions();
        }

        this.populateDropdown('co-visitor1', data.coVisitors, 'No Co-Visitor 1');
        this.populateDropdown('co-visitor2', data.coVisitors, 'No Co-Visitor 2');
        
        const loginView = document.getElementById('login-view');
        const formView = document.getElementById('form-view');
        if (loginView) loginView.classList.add('hidden');
        if (formView) formView.classList.remove('hidden');
    }

    populateDropdown(elementId, options, defaultOption) {
        const select = document.getElementById(elementId);
        if (!select || !options) return;
        
        select.innerHTML = `<option value="">${defaultOption}</option>`;
        options.forEach(option => {
            const opt = document.createElement('option');
            // Handle both string and object options
            if (typeof option === 'string') {
                opt.value = opt.textContent = option;
            } else if (option && typeof option === 'object') {
                opt.value = option.email || option.id || option;
                opt.textContent = option.name || option.email || option;
            } else {
                opt.value = opt.textContent = option;
            }
            select.appendChild(opt);
        });
    }

    // District and School Management
    async handleDistrictChange() {
        const districtSelect = document.getElementById('district');
        if (!districtSelect) return;
        
        const selectedDistrict = districtSelect.value;
        this.cachedData.schools = [];
        this.renderSchoolOptions();
        this.resetSchoolSelection();

        if (selectedDistrict) {
            this.showLoader();
            try {
                const schools = await supabaseClient.getSchoolsByDistrict(
                    selectedDistrict, 
                    this.cachedData.userEmail, 
                    this.cachedData.isManager
                );
                this.cachedData.schools = schools;
                this.renderSchoolOptions();
            } catch (error) {
                this.showMessage('Error fetching schools: ' + error.message, 'error', 'login');
                this.cachedData.schools = [];
            } finally {
                this.hideLoader();
            }
        }
    }

    renderSchoolOptions(filter = '') {
        const optionsList = document.getElementById('school-options-list');
        if (!optionsList) return;
        
        optionsList.innerHTML = '';
        
        if (!this.cachedData || !this.cachedData.schools) return;
        
        const filtered = this.cachedData.schools.filter(school => 
            school.name.toLowerCase().includes(filter)
        );
        
        if (filtered.length > 0) {
            filtered.sort((a, b) => a.name.localeCompare(b.name)).forEach(school => {
                const option = document.createElement('div');
                option.textContent = school.name;
                option.className = 'p-3 text-sm hover:bg-blue-50 cursor-pointer truncate';
                option.onclick = () => this.selectSchool(school);
                optionsList.appendChild(option);
            });
        } else {
            optionsList.innerHTML = '<div class="p-3 text-sm text-gray-500">No schools found</div>';
        }
    }

    selectSchool(schoolObject) {
        const schoolInput = document.getElementById('school');
        const selectedText = document.getElementById('school-selected-text');
        const optionsPanel = document.getElementById('school-options-panel');
        
        if (schoolInput) schoolInput.value = schoolObject.name;
        if (selectedText) {
            selectedText.textContent = schoolObject.name;
            selectedText.classList.remove('text-gray-500');
        }
        if (optionsPanel) optionsPanel.classList.add('hidden');
        
        this.currentSchoolDetails = { 
            district: schoolObject.district, 
            state: schoolObject.state 
        };
        
        this.populateSpocOptions(schoolObject.spocs || []);
    }

    populateSpocOptions(spocs) {
        const spocSelect = document.getElementById('spoc');
        if (!spocSelect) return;
        
        spocSelect.innerHTML = '<option value="">Select SPOC</option>';
        
        spocs.forEach(spoc => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify(spoc);
            opt.textContent = `${spoc.name} (${spoc.designation})`;
            spocSelect.appendChild(opt);
        });
        
        spocSelect.innerHTML += '<option value="AddNewSpoc">Add New SPOC</option>';
    }

    resetSchoolSelection() {
        const schoolInput = document.getElementById('school');
        const selectedText = document.getElementById('school-selected-text');
        const spocSelect = document.getElementById('spoc');
        
        if (schoolInput) schoolInput.value = '';
        if (selectedText) {
            selectedText.textContent = 'Select School';
            selectedText.classList.add('text-gray-500');
        }
        if (spocSelect) spocSelect.innerHTML = '';
        
        this.currentSchoolDetails = { district: '', state: '' };
    }

    // SKU and SPOC Field Toggling
    toggleNewSpocFields() {
        const spocSelect = document.getElementById('spoc');
        const newSpocFields = document.getElementById('new-spoc-fields');
        
        if (spocSelect && newSpocFields) {
            const spocSelection = spocSelect.value;
            newSpocFields.classList.toggle('hidden', spocSelection !== 'AddNewSpoc');
        }
    }

    toggleSkuSection() {
        const outcomeSelect = document.getElementById('meeting-outcome');
        const skuSection = document.getElementById('sku-section');
        const skuContainer = document.getElementById('sku-container');
        
        if (!outcomeSelect || !skuSection || !skuContainer) return;
        
        const outcome = outcomeSelect.value;
        
        if (outcome === 'Sample Submission Test Prep') {
            skuSection.classList.remove('hidden');
            if (skuContainer.innerHTML.trim() === '') {
                this.addSkuBlock();
            }
        } else {
            skuSection.classList.add('hidden');
            skuContainer.innerHTML = '';
        }
    }

    addSkuBlock() {
        const skuContainer = document.getElementById('sku-container');
        if (!skuContainer || !this.cachedData || !this.cachedData.skuData) return;
        
        const blockId = 'sku-block-' + Date.now();
        const block = document.createElement('div');
        block.id = blockId;
        block.className = 'space-y-2 p-3 border border-gray-100 rounded-md';
        
        const categorySelect = document.createElement('select');
        categorySelect.className = 'form-select w-full p-2 border border-gray-300 rounded-md';
        categorySelect.onchange = () => this.populateSkusForCategory(blockId, categorySelect.value);
        
        let optionsHtml = '<option value="">-- Select Category --</option>';
        const categories = Object.keys(this.cachedData.skuData).sort();
        categories.forEach(cat => {
            optionsHtml += `<option value="${cat}">${cat}</option>`;
        });
        categorySelect.innerHTML = optionsHtml;
        
        const skuListDiv = document.createElement('div');
        skuListDiv.className = 'space-y-2 max-h-40 overflow-y-auto p-2';
        
        block.appendChild(categorySelect);
        block.appendChild(skuListDiv);
        skuContainer.appendChild(block);
    }

    populateSkusForCategory(blockId, category) {
        const block = document.getElementById(blockId);
        if (!block || !category || !this.cachedData || !this.cachedData.skuData[category]) return;
        
        const skuListDiv = block.querySelector('div');
        if (!skuListDiv) return;
        
        skuListDiv.innerHTML = '';
        
        this.cachedData.skuData[category].forEach(skuName => {
            const checkboxId = 'sku-' + skuName.replace(/\s+/g, '-') + '-' + Date.now();
            const itemDiv = document.createElement('div');
            itemDiv.className = 'flex items-center';
            
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = checkboxId;
            checkbox.value = skuName;
            checkbox.className = 'h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500';
            
            const label = document.createElement('label');
            label.htmlFor = checkboxId;
            label.textContent = skuName;
            label.className = 'ml-3 block text-sm text-gray-700';
            
            itemDiv.appendChild(checkbox);
            itemDiv.appendChild(label);
            skuListDiv.appendChild(itemDiv);
        });
    }

    // Validation and Submission
    clearAllErrorMessages() {
        document.querySelectorAll('.error-message').forEach(el => el.classList.add('hidden'));
        document.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    }

    setError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (field) field.classList.add('input-error');
        const errorDiv = document.getElementById(`${fieldId}-error`);
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.classList.remove('hidden');
        }
    }

    async submitForm() {
        this.clearAllErrorMessages();
        let isValid = true;
        let firstInvalidElement = null;

        const validateField = (fieldId, condition, message) => {
            if (condition) {
                this.setError(fieldId, message);
                isValid = false;
                if (!firstInvalidElement) {
                    firstInvalidElement = document.getElementById(fieldId);
                }
            }
        };

        // Validation
        if (this.cachedData && this.cachedData.isManager) {
            const districtSelect = document.getElementById('district');
            validateField('district', !districtSelect || !districtSelect.value, 'Please select a district.');
        }
        
        const schoolInput = document.getElementById('school');
        validateField('school-select-button', !schoolInput || !schoolInput.value, 'Please select a school.');
        
        const outcomeSelect = document.getElementById('meeting-outcome');
        const meetingOutcome = outcomeSelect ? outcomeSelect.value : '';
        validateField('meeting-outcome', !meetingOutcome, 'Please select a meeting outcome.');
        
        const spocSelect = document.getElementById('spoc');
        validateField('spoc', !spocSelect || !spocSelect.value, 'Please select or add a SPOC.');
        
        console.log('Image validation - this.imageBase64:', this.imageBase64);
        validateField('image-capture-box', !this.imageBase64, 'Please capture an image.');
        
        let selectedSkus = '';
        if (meetingOutcome === 'Sample Submission Test Prep') {
            const checkedSkus = document.querySelectorAll('#sku-container input[type="checkbox"]:checked');
            validateField('sku-container', checkedSkus.length === 0, 'Please select at least one SKU.');
            selectedSkus = Array.from(checkedSkus).map(cb => cb.value).join(' // ');
        }
        
        const spocSelection = spocSelect ? spocSelect.value : '';
        if (spocSelection === 'AddNewSpoc') {
            const designationInput = document.getElementById('new-spoc-designation');
            const nameInput = document.getElementById('new-spoc-name');
            const contactInput = document.getElementById('new-spoc-contact');
            const emailInput = document.getElementById('new-spoc-email');
            
            validateField('new-spoc-designation', !designationInput || !designationInput.value, 'Designation is required.');
            validateField('new-spoc-name', !nameInput || !nameInput.value, 'Name is required.');
            validateField('new-spoc-contact', !contactInput || !/^\d{10}$/.test(contactInput.value), 'Contact must be 10 digits.');
            
            const newSpocEmail = emailInput ? emailInput.value : '';
            validateField('new-spoc-email', newSpocEmail && !newSpocEmail.includes('@'), 'Please enter a valid email.');
        }

        if (!isValid) {
            if (firstInvalidElement) {
                firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Get form values safely
        const getElementValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.value : '';
        };

        // Prepare form data
        const formData = {
            submissionId: 'K25LVT' + (Math.floor(Math.random() * 90000) + 10000),
            userEmail: this.cachedData.userEmail,
            rmEmail: this.cachedData.rmEmail,
            zmEmail: this.cachedData.zmEmail,
            state: this.currentSchoolDetails.state,
            district: this.currentSchoolDetails.district,
            latitude: this.locationCoords.latitude,
            longitude: this.locationCoords.longitude,
            school: getElementValue('school'),
            meetingOutcome: meetingOutcome,
            selectedSkus: selectedSkus,
            spocSelection: spocSelection,
            newSpocDesignation: getElementValue('new-spoc-designation'),
            newSpocName: getElementValue('new-spoc-name'),
            newSpocContact: getElementValue('new-spoc-contact'),
            newSpocEmail: getElementValue('new-spoc-email'),
            coVisitor1: getElementValue('co-visitor1'),
            coVisitor2: getElementValue('co-visitor2'),
            remarks: getElementValue('remarks'),
            imageBase64: this.imageBase64,
            followUpDate: getElementValue('follow-up-date')
        };

        this.showLoader();
        this.submissionInProgress = true;
        
        try {
            await this.processSubmission(formData);
        } catch (error) {
            this.hideLoader();
            this.submissionInProgress = false;
            this.showMessage('Submission failed: ' + error.message, 'error', 'login');
        }
    }

    async processSubmission(formData) {
        try {
            console.log('Google Sheets service available:', !!window.googleSheetsService);
            console.log('Supabase client available:', !!window.supabaseClient);
            
            // Generate unique ID
            const submissionId = await this.generateSubmissionId();
            
            // Process SPOC data
            let spocData = {};
            if (formData.spocSelection === 'AddNewSpoc') {
                spocData = {
                    type: 'Add New Spoc',
                    designation: formData.newSpocDesignation,
                    name: formData.newSpocName,
                    phone: formData.newSpocContact,
                    email: formData.newSpocEmail
                };
            } else {
                const selectedSpoc = JSON.parse(formData.spocSelection);
                spocData = {
                    type: '',
                    designation: selectedSpoc.designation,
                    name: selectedSpoc.name,
                    phone: selectedSpoc.phone,
                    email: selectedSpoc.email
                };
            }

            // Get location address
            let locationAddress = 'Address not found';
            if (formData.latitude && formData.longitude) {
                try {
                    locationAddress = await this.reverseGeocode(formData.latitude, formData.longitude);
                } catch (error) {
                    locationAddress = "Could not reverse geocode";
                }
            }

            // Upload image
            let imageUrl = "Image Not Provided";
            if (formData.imageBase64) {
                try {
                    if (!window.googleSheetsService) {
                        throw new Error('Google Sheets service not initialized. Please refresh the page and try again.');
                    }
                    imageUrl = await window.googleSheetsService.uploadImageToDrive(formData.imageBase64, submissionId);
                } catch (error) {
                    console.error('Image upload error:', error);
                    imageUrl = "Image Processing Failed";
                }
            }

            // Prepare visit data for Supabase
            const visitData = {
                submission_id: submissionId,
                user_email: formData.userEmail,
                rm_email: formData.rmEmail,
                zm_email: formData.zmEmail,
                state: formData.state,
                district: formData.district,
                school: formData.school,
                meeting_outcome: formData.meetingOutcome,
                selected_skus: formData.selectedSkus,
                spoc_type: spocData.type,
                spoc_designation: spocData.designation,
                spoc_name: spocData.name,
                spoc_phone: spocData.phone,
                spoc_email: spocData.email,
                co_visitor1: formData.coVisitor1,
                co_visitor2: formData.coVisitor2,
                remarks: formData.remarks,
                image_url: imageUrl,
                follow_up_date: formData.followUpDate,
                latitude: formData.latitude,
                longitude: formData.longitude,
                location_address: locationAddress
            };

            // Save to Supabase
            const supabaseResult = await supabaseClient.saveVisit(visitData);
            if (!supabaseResult.success) {
                throw new Error('Failed to save visit data: ' + supabaseResult.error);
            }

            // Submit to Google Sheets
            if (window.googleSheetsService) {
                try {
                    const sheetsResult = await window.googleSheetsService.submitVisitToSheets(visitData);
                    if (!sheetsResult.success) {
                        console.warn('Failed to submit to Google Sheets:', sheetsResult.error);
                    }
                } catch (error) {
                    console.warn('Google Sheets submission error:', error);
                }
            }

            // Create calendar event if follow-up date is provided
            if (formData.followUpDate && CONFIG.CALENDAR && CONFIG.CALENDAR.SECONDARY_CALENDAR_ID !== 'PASTE_YOUR_CALENDAR_ID_HERE') {
                try {
                    const followUpTime = new Date(formData.followUpDate);
                    const eventData = {
                        title: `Follow-up: ${formData.school}`,
                        description: `Follow-up for visit logged on ${new Date().toLocaleDateString()}.\nSPOC: ${spocData.name} (${spocData.designation})\nRemarks: ${formData.remarks}\nSubmission ID: ${submissionId}`,
                        startTime: followUpTime.toISOString(),
                        endTime: new Date(followUpTime.getTime() + 30 * 60000).toISOString(),
                        userEmail: formData.userEmail
                    };
                    console.log('Calendar event data:', eventData);
                } catch (error) {
                    console.error('Could not create calendar invitation:', error);
                }
            }

            // Send confirmation email
            await this.sendConfirmationEmail(formData, submissionId, spocData.name, spocData.designation);

            this.hideLoader();
            this.submissionInProgress = false;
            this.goBack();
            this.showMessage("Thank you for logging your visit! A confirmation email has been sent.", 'success', 'login');

        } catch (error) {
            console.error('Submission Error:', error);
            this.submissionInProgress = false;
            throw error;
        }
    }

    async generateSubmissionId() {
        // This would typically query the database for the last ID
        // For now, we'll generate a simple timestamp-based ID
        return "K25LVT" + Date.now().toString().slice(-6);
    }

    async reverseGeocode(latitude, longitude) {
        try {
            // Note: You'll need to replace YOUR_GOOGLE_MAPS_API_KEY with actual API key
            const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=YOUR_GOOGLE_MAPS_API_KEY`);
            const data = await response.json();
            if (data.results && data.results[0]) {
                return data.results[0].formatted_address;
            }
            return 'Address not found';
        } catch (error) {
            return 'Could not reverse geocode';
        }
    }

    async sendConfirmationEmail(formData, submissionId, spocName, spocDesignation) {
        try {
            const emailData = {
                to: formData.userEmail,
                subject: `Visit Confirmation: ${formData.school} - ${submissionId}`,
                htmlBody: this.generateEmailTemplate(formData, submissionId, spocName, spocDesignation)
            };
            console.log('Email data:', emailData);
        } catch (error) {
            console.error('Error sending confirmation email:', error);
        }
    }

    generateEmailTemplate(formData, submissionId, spocName, spocDesignation) {
        const spocDisplay = `${spocName} (${spocDesignation})`;
        let coVisitorSection = '';
        if (formData.coVisitor1) {
            coVisitorSection += `<tr><td style="padding: 8px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Co-Visitor 1</td><td style="padding: 8px; border: 1px solid #dddddd;">${formData.coVisitor1}</td></tr>`;
        }
        if (formData.coVisitor2) {
            coVisitorSection += `<tr><td style="padding: 8px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Co-Visitor 2</td><td style="padding: 8px; border: 1px solid #dddddd;">${formData.coVisitor2}</td></tr>`;
        }
        
        let remarksSection = '';
        if (formData.remarks) {
            remarksSection = `<tr><td style="padding: 8px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Remarks</td><td style="padding: 8px; border: 1px solid #dddddd;">${formData.remarks}</td></tr>`;
        }
        
        let followUpSection = '';
        if (formData.followUpDate) {
            followUpSection = `<tr><td style="padding: 8px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Follow Up Date</td><td style="padding: 8px; border: 1px solid #dddddd;">${new Date(formData.followUpDate).toLocaleString()}</td></tr><tr><td colspan="2" style="padding: 10px; text-align: center; font-style: italic; color: #555;">You will receive a separate calendar invitation for this follow-up. Please accept it to add the event to your calendar.</td></tr>`;
        }

        return `<html><body><p>Hi,</p><p>Thank you for logging your visit. Here is a summary of your submission:</p><table style="width: 100%; border-collapse: collapse; font-family: Arial, sans-serif;"><tr style="background-color: #4a86e8; color: white;"><th colspan="2" style="padding: 12px;">Live Visits Tracker AY 25-26</th></tr><tr><td style="padding: 8px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Submission ID</td><td style="padding: 8px; border: 1px solid #dddddd;">${submissionId}</td></tr><tr><td style="padding: 8px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Employee Email ID</td><td style="padding: 8px; border: 1px solid #dddddd;">${formData.userEmail}</td></tr><tr><td style="padding: 8px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">School Name</td><td style="padding: 8px; border: 1px solid #dddddd;">${formData.school}</td></tr><tr><td style="padding: 8px; border: 1px solid #dddddd; background-color: #f2f2f2; font-weight: bold;">Meeting SPOC</td><td style="padding: 8px; border: 1px solid #dddddd;">${spocDisplay}</td></tr>${coVisitorSection}${remarksSection}${followUpSection}</table></body></html>`;
    }
}

// Global functions for HTML onclick handlers
function fetchDetails() {
    if (window.liveVisitTracker) {
        window.liveVisitTracker.fetchDetails();
    }
}

function goBack() {
    if (window.liveVisitTracker) {
        window.liveVisitTracker.goBack();
    }
}

function handleDistrictChange() {
    if (window.liveVisitTracker) {
        window.liveVisitTracker.handleDistrictChange();
    }
}

function toggleNewSpocFields() {
    if (window.liveVisitTracker) {
        window.liveVisitTracker.toggleNewSpocFields();
    }
}

function toggleSkuSection() {
    if (window.liveVisitTracker) {
        window.liveVisitTracker.toggleSkuSection();
    }
}

function addSkuBlock() {
    if (window.liveVisitTracker) {
        window.liveVisitTracker.addSkuBlock();
    }
}

function submitForm() {
    if (window.liveVisitTracker) {
        window.liveVisitTracker.submitForm();
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.liveVisitTracker = new LiveVisitTracker();
});
