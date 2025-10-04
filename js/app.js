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
        console.log('Live Visit Tracker initialized');
    }

    setupEventListeners() {
        // Image capture
        const imageInput = document.getElementById('image-capture-input');
        const imageCaptureBox = document.getElementById('image-capture-box');
        imageCaptureBox.addEventListener('click', () => imageInput.click());
        
        imageInput.addEventListener('change', (event) => {
            const file = event.target.files[0];
            if (file) {
                // Call the compressImage function from app.html
                if (typeof window.compressImage === 'function') {
                    window.compressImage(file);
                } else {
                    console.error('compressImage function not found');
                }
            }
        });

        // School dropdown
        const schoolDropdownContainer = document.getElementById('school-dropdown-container');
        const schoolSelectButton = document.getElementById('school-select-button');
        const schoolOptionsPanel = document.getElementById('school-options-panel');
        const schoolSearchInput = document.getElementById('school-search-input');
        
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
            if (!schoolDropdownContainer.contains(e.target)) {
                schoolOptionsPanel.classList.add('hidden');
            }
        });
    }

    // UI Helper Functions
    showLoader() {
        document.getElementById('loader').classList.remove('hidden');
    }

    hideLoader() {
        document.getElementById('loader').classList.add('hidden');
    }

    showMessage(text, type, view = 'login') {
        const msgArea = document.getElementById(`message-area-${view}`);
        msgArea.innerHTML = `<div class="message ${type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">${text}</div>`;
    }

    clearMessages() {
        document.getElementById('message-area-login').innerHTML = '';
    }

    goBack() {
        document.getElementById('form-view').classList.add('hidden');
        document.getElementById('login-view').classList.remove('hidden');
        document.getElementById('visit-form').reset();
        this.clearAllErrorMessages();
        document.getElementById('image-preview').classList.add('hidden');
        document.getElementById('image-placeholder').classList.remove('hidden');
        document.getElementById('new-spoc-fields').classList.add('hidden');
        document.getElementById('sku-section').classList.add('hidden');
        document.getElementById('sku-container').innerHTML = '';
        document.getElementById('school-selected-text').textContent = 'Select School';
        document.getElementById('school-selected-text').classList.add('text-gray-500');
        document.getElementById('school').value = '';
        document.getElementById('school-options-panel').classList.add('hidden');
        document.getElementById('district-filter-container').classList.add('hidden');
        this.imageBase64 = null;
        this.currentSchoolDetails = { district: '', state: '' };
    }

    // Image Compression
    compressImage(file) {
        const MAX_WIDTH = CONFIG.APP.IMAGE_COMPRESSION.MAX_WIDTH;
        const MAX_HEIGHT = CONFIG.APP.IMAGE_COMPRESSION.MAX_HEIGHT;
        const QUALITY = CONFIG.APP.IMAGE_COMPRESSION.QUALITY;

        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
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

                const canvas = document.getElementById('image-canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // Get the compressed image data as a Base64 string
                this.imageBase64 = canvas.toDataURL('image/jpeg', QUALITY);

                // Update the UI
                document.getElementById('image-preview').src = this.imageBase64;
                document.getElementById('image-preview').classList.remove('hidden');
                document.getElementById('image-placeholder').classList.add('hidden');
                this.clearAllErrorMessages();
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Data Fetching
    async fetchDetails() {
        this.clearMessages();
        const email = document.getElementById('email').value.trim().toLowerCase();
        
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
                    () => {
                        reject(new Error('Location access is required. Please allow location access.'));
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
        if (data.isManager) {
            document.getElementById('district-filter-container').classList.remove('hidden');
            this.populateDropdown('district', data.districts, 'Select District to Load Schools');
        } else {
            document.getElementById('district-filter-container').classList.add('hidden');
            this.renderSchoolOptions();
        }

        this.populateDropdown('co-visitor1', data.coVisitors, 'No Co-Visitor 1');
        this.populateDropdown('co-visitor2', data.coVisitors, 'No Co-Visitor 2');
        
        document.getElementById('login-view').classList.add('hidden');
        document.getElementById('form-view').classList.remove('hidden');
    }

    populateDropdown(elementId, options, defaultOption) {
        const select = document.getElementById(elementId);
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
        const selectedDistrict = document.getElementById('district').value;
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
        document.getElementById('school').value = schoolObject.name;
        const selectedText = document.getElementById('school-selected-text');
        selectedText.textContent = schoolObject.name;
        selectedText.classList.remove('text-gray-500');
        document.getElementById('school-options-panel').classList.add('hidden');
        
        this.currentSchoolDetails = { 
            district: schoolObject.district, 
            state: schoolObject.state 
        };
        
        this.populateSpocOptions(schoolObject.spocs || []);
    }

    populateSpocOptions(spocs) {
        const spocSelect = document.getElementById('spoc');
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
        document.getElementById('school').value = '';
        const selectedText = document.getElementById('school-selected-text');
        selectedText.textContent = 'Select School';
        selectedText.classList.add('text-gray-500');
        document.getElementById('spoc').innerHTML = '';
        this.currentSchoolDetails = { district: '', state: '' };
    }

    // SKU and SPOC Field Toggling
    toggleNewSpocFields() {
        const spocSelection = document.getElementById('spoc').value;
        document.getElementById('new-spoc-fields').classList.toggle('hidden', spocSelection !== 'AddNewSpoc');
    }

    toggleSkuSection() {
        const outcome = document.getElementById('meeting-outcome').value;
        const skuSection = document.getElementById('sku-section');
        const skuContainer = document.getElementById('sku-container');
        
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
        const blockId = 'sku-block-' + Date.now();
        const block = document.createElement('div');
        block.id = blockId;
        block.className = 'space-y-2 p-3 border border-gray-100 rounded-md';
        
        const categorySelect = document.createElement('select');
        categorySelect.className = 'form-select';
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
        const skuListDiv = block.querySelector('div');
        skuListDiv.innerHTML = '';
        
        if (category && this.cachedData.skuData[category]) {
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
        if (this.cachedData.isManager) {
            validateField('district', !document.getElementById('district').value, 'Please select a district.');
        }
        validateField('school-select-button', !document.getElementById('school').value, 'Please select a school.');
        
        const meetingOutcome = document.getElementById('meeting-outcome').value;
        validateField('meeting-outcome', !meetingOutcome, 'Please select a meeting outcome.');
        validateField('spoc', !document.getElementById('spoc').value, 'Please select or add a SPOC.');
        console.log('Image validation - this.imageBase64:', this.imageBase64);
        console.log('Image validation - window.imageBase64:', window.imageBase64);
        validateField('image-capture-box', !this.imageBase64, 'Please capture an image.');
        
        let selectedSkus = '';
        if (meetingOutcome === 'Sample Submission Test Prep') {
            const checkedSkus = document.querySelectorAll('#sku-container input[type="checkbox"]:checked');
            validateField('sku-container', checkedSkus.length === 0, 'Please select at least one SKU.');
            selectedSkus = Array.from(checkedSkus).map(cb => cb.value).join(' // ');
        }
        
        const spocSelection = document.getElementById('spoc').value;
        if (spocSelection === 'AddNewSpoc') {
            validateField('new-spoc-designation', !document.getElementById('new-spoc-designation').value, 'Designation is required.');
            validateField('new-spoc-name', !document.getElementById('new-spoc-name').value, 'Name is required.');
            validateField('new-spoc-contact', !/^\d{10}$/.test(document.getElementById('new-spoc-contact').value), 'Contact must be 10 digits.');
            const newSpocEmail = document.getElementById('new-spoc-email').value;
            validateField('new-spoc-email', newSpocEmail && !newSpocEmail.includes('@'), 'Please enter a valid email.');
        }

        if (!isValid) {
            if (firstInvalidElement) {
                firstInvalidElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
            return;
        }

        // Prepare form data
        const formData = {
            submissionId: 'K8LVT' + (Math.floor(Math.random() * 90000) + 10000), // K8LVT format
            userEmail: this.cachedData.userEmail,
            rmEmail: this.cachedData.rmEmail,
            zmEmail: this.cachedData.zmEmail,
            state: this.currentSchoolDetails.state,
            district: this.currentSchoolDetails.district,
            latitude: this.locationCoords.latitude,
            longitude: this.locationCoords.longitude,
            school: document.getElementById('school').value,
            meetingOutcome: meetingOutcome,
            selectedSkus: selectedSkus,
            spocSelection: spocSelection,
            newSpocDesignation: document.getElementById('new-spoc-designation').value,
            newSpocName: document.getElementById('new-spoc-name').value,
            newSpocContact: document.getElementById('new-spoc-contact').value,
            newSpocEmail: document.getElementById('new-spoc-email').value,
            coVisitor1: document.getElementById('co-visitor1').value,
            coVisitor2: document.getElementById('co-visitor2').value,
            remarks: document.getElementById('remarks').value,
            imageBase64: this.imageBase64,
            followUpDate: document.getElementById('follow-up-date').value
        };

        this.showLoader();
        this.submissionInProgress = true;
        
        try {
            await this.processSubmission(formData);
        } catch (error) {
            this.hideLoader();
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
            if (!window.googleSheetsService) {
                throw new Error('Google Sheets service not initialized. Please refresh the page and try again.');
            }
            const sheetsResult = await window.googleSheetsService.submitVisitToSheets(visitData);
            if (!sheetsResult.success) {
                console.warn('Failed to submit to Google Sheets:', sheetsResult.error);
            }

            // Create calendar event if follow-up date is provided
            if (formData.followUpDate && CONFIG.CALENDAR.SECONDARY_CALENDAR_ID !== 'PASTE_YOUR_CALENDAR_ID_HERE') {
                try {
                    const followUpTime = new Date(formData.followUpDate);
                    const eventData = {
                        title: `Follow-up: ${formData.school}`,
                        description: `Follow-up for visit logged on ${new Date().toLocaleDateString()}.\nSPOC: ${spocData.name} (${spocData.designation})\nRemarks: ${formData.remarks}\nSubmission ID: ${submissionId}`,
                        startTime: followUpTime.toISOString(),
                        endTime: new Date(followUpTime.getTime() + 30 * 60000).toISOString(),
                        userEmail: formData.userEmail
                    };
                    // Calendar event creation - to be implemented if needed
                    console.log('Calendar event data:', eventData);
                } catch (error) {
                    console.error('Could not create calendar invitation:', error);
                }
            }

            // Send confirmation email
            await this.sendConfirmationEmail(formData, submissionId, spocData.name, spocData.designation);

            this.hideLoader();
            this.goBack();
            this.showMessage("Thank you for logging your visit! A confirmation email has been sent.", 'success', 'login');

        } catch (error) {
            console.error('Submission Error:', error);
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
            // Email sending - to be implemented if needed
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
    window.liveVisitTracker.fetchDetails();
}

function goBack() {
    window.liveVisitTracker.goBack();
}

function handleDistrictChange() {
    window.liveVisitTracker.handleDistrictChange();
}

function toggleNewSpocFields() {
    window.liveVisitTracker.toggleNewSpocFields();
}

function toggleSkuSection() {
    window.liveVisitTracker.toggleSkuSection();
}

function addSkuBlock() {
    window.liveVisitTracker.addSkuBlock();
}

function submitForm() {
    window.liveVisitTracker.submitForm();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    window.liveVisitTracker = new LiveVisitTracker();
});
