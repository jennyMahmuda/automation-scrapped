function leadApp() {
            return {
                prompt: '',
                outreachStyle: '',
                draftType: 'general',
                generateOutreach: true,
                keyword: '',
                location: '',
                sheetId: '',
                autoPushEnabled: false,
                maxResults: 20,
                pushBatchSize: 50,
                workspaceSavedAt: '',
                verifiedOnly: true,
                loading: false,
                manualPushLoading: false,
                showPricingModal: false,
                showByokModal: false,
                showByokSuccess: false,
                showAuthModal: false,
                showSuccessPopup: false,
                showNewsletterPopup: false,
                showReviewModal: false,
                newsletterEmail: '',
                newsletterSubmitting: false,
                newsletterStatus: '',
                reviews: [],
                reviewName: '',
                reviewRole: '',
                reviewRating: 5,
                reviewMessage: '',
                reviewSubmitting: false,
                reviewError: '',
                authMode: 'login',
                authEmail: '',
                authPassword: '',
                authError: '',
                authLoading: false,
                currentUser: null,
                authToken: localStorage.getItem('nexusleads-token') || '',
                sheetChecking: false,
                serviceAccountEmail: 'support@sayadbayezid.com',
                byokMapsKey: '',
                byokGeminiKey: '',
                byokServiceJson: '',
                credits: { used: 0, limit: 100, remaining: 100 },
                clientId: '',
                leads: [],
                message: '',
                progress: 0,
                stage: 0,
                activity: [{ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), text: 'Dashboard ready for a new research run.' }],
                metrics: { found: 0, verified: 0, emails: 0, sheet: 'Waiting' },
                apiBase: (document.querySelector('meta[name="nexus-api-base"]')?.content || window.NEXUS_API_BASE || 'http://localhost:8787').replace(/\/$/, ''),
                track(eventName, parameters = {}) {
                    if (typeof window.nexusTrack === 'function') window.nexusTrack(eventName, parameters);
                },
                async postJson(path, payload) {
                    const headers = { 'Content-Type': 'application/json', 'X-Nexus-Client-ID': this.clientId };
                    if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
                    const response = await fetch(this.apiBase + path, {
                        method: 'POST',
                        headers,
                        body: JSON.stringify(payload)
                    });
                    const data = await response.json().catch(() => ({}));
                    if (response.status === 401 || data.code === 'AUTH_REQUIRED') {
                        this.showAuthModal = true;
                        this.authMode = 'login';
                        throw new Error('Please log in to your NexusLeads account.');
                    }
                    if (!response.ok) {
                        if (data.code === 'DAILY_CREDIT_LIMIT' || response.status === 402) {
                            this.showPricingModal = true;
                            throw new Error(data.error || 'Daily free limit reached.');
                        }
                        throw new Error(data.error || 'The backend request failed.');
                    }
                    if (!data.success) throw new Error(data.error || 'The backend request failed.');
                    return data;
                },
                async searchLeads() {
                    if (!this.prompt.trim() && (!this.keyword.trim() || !this.location.trim())) {
                        this.message = 'Enter an AI research prompt, or provide both a keyword and location.';
                        return;
                    }
                    if (this.autoPushEnabled && !this.sheetId.trim()) {
                        this.message = 'Auto-Push is enabled. Paste a Google Sheet URL, or turn Auto-Push off and use Sync Selected later.';
                        return;
                    }
                    this.loading = true;
                    this.message = '';
                    this.progress = 5;
                    this.stage = 1;
                    this.metrics = { found: 0, verified: 0, emails: 0, sheet: this.autoPushEnabled ? 'Preparing' : 'Manual mode' };
                    const runLabel = this.prompt.trim() || `${this.keyword} near ${this.location}`;
                    this.track('lead_search_started', { mode: this.prompt.trim() ? 'ai_prompt' : 'keyword_location', max_results: Number(this.maxResults), verified_only: this.verifiedOnly, auto_push: this.autoPushEnabled });
                    const payload = {
                        prompt: this.prompt,
                        outreach_style: this.outreachStyle,
                        draft_type: this.draftType,
                        generate_outreach: this.generateOutreach,
                        keyword: this.keyword,
                        location: this.location,
                        verified_only: this.verifiedOnly,
                        max_results: Number(this.maxResults),
                        enrich_with_ai: true
                    };
                    this.activity.unshift({ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), text: `Starting ${this.maxResults}-lead research: ${runLabel}.` });
                    try {
                        const discovered = await this.postJson('/api/discover', payload);
                        const candidates = discovered.candidates || [];
                        this.progress = 25;
                        this.activity.unshift({ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), text: `Discovered ${candidates.length} candidates across Google Places query batches.` });
                        this.stage = 2;
                        let enriched = [];
                        for (let index = 0; index < candidates.length; index += 5) {
                            const batch = candidates.slice(index, index + 5);
                            const result = await this.postJson('/api/enrich', { ...payload, leads: batch, batch_index: Math.floor(index / 5) + 1 });
                            enriched = enriched.concat(result.leads || []);
                            this.progress = 25 + Math.round(((index + batch.length) / Math.max(candidates.length, 1)) * 55);
                            this.activity.unshift({ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), text: `Verified and enriched ${Math.min(index + batch.length, candidates.length)} of ${candidates.length} candidates.` });
                        }
                        const verified = enriched.filter(item => item.phone && item.email);
                    const incomingLeads = (this.verifiedOnly ? verified : enriched).slice(0, Number(this.maxResults));
                    const existingIds = new Set(this.leads.map(l => l.place_id || `${l.name}|${l.address}`));
                    const newLeads = incomingLeads
                        .map(item => ({ ...item, selected: false, synced: false }))
                        .filter(item => !existingIds.has(item.place_id || `${item.name}|${item.address}`));
                    
                    this.leads = [...this.leads, ...newLeads];
                    this.persistWorkspace();
                    this.metrics.found = this.leads.length;
                    this.metrics.verified = this.leads.filter(l => l.phone && l.email).length;
                    this.metrics.emails = this.leads.filter(l => l.email).length;
                        this.stage = 3;
                        this.progress = 90;
                        let sheetMessage;
                            if (this.autoPushEnabled && this.leads.length > 0) {
                            const sheetData = await this.postJson('/api/export', {
                                sheet_id: this.sheetId,
                                leads: this.leads,
                                leads_sheet_tab: 'Leads',
                                outreach_sheet_tab: 'Outreach'
                            });
                            this.leads.forEach(lead => { lead.synced = true; lead.synced_at = new Date().toISOString(); });
                            this.persistWorkspace();
                            this.metrics.sheet = 'Synced';
                            sheetMessage = `Auto-Push complete: ${this.leads.length} lead(s) synced to Leads and Outreach.`;
                            this.activity.unshift({ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), text: sheetMessage });
                        } else {
                            this.metrics.sheet = 'Manual mode';
                            sheetMessage = `Found ${this.leads.length} selected-ready lead(s) from ${candidates.length} candidates. Select leads below and use Sync Selected.`;
                        }
                        const verificationMessage = this.verifiedOnly && this.leads.length < Number(this.maxResults) ? ` Verified results available: ${verified.length}; uncheck “Verified leads only” if you want all public listings.` : '';
                        this.message = sheetMessage + verificationMessage;
                        this.track('lead_search_completed', { leads_found: this.leads.length, verified_leads: verified.length, emails_found: this.metrics.emails, sheet_status: this.metrics.sheet, outreach_drafts: this.generateOutreach });
                        if (this.leads.length > 0) this.maybeShowSuccessPopup();
                    } catch (err) {
                        console.error(err);
                        this.progress = 0;
                        this.stage = 0;
                        this.metrics.sheet = 'Error';
                        this.activity.unshift({ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), text: err.message || 'Connection error with the Cloudflare backend.' });
                        this.message = err.message || 'Connection error with the Cloudflare backend.';
                        this.track('lead_search_failed', { error_type: err?.message ? 'backend_or_validation' : 'unknown' });
                    } finally {
                        this.loading = false;
                        if (this.progress >= 90) this.progress = 100;
                    }
                },
                openDashboard(event) {
                    if (event) event.preventDefault();
                    const authenticated = Boolean(this.authToken && this.currentUser);
                    this.track('dashboard_entry_click', { authenticated });
                    const destination = event?.currentTarget?.getAttribute('href') || 'dashboard.html';
                    window.location.href = destination;
                },
                async initApp() {
                    this.track('app_open', { page: 'nexusleads_home' });
                    this.loadSheetConfig();
                    let cid = localStorage.getItem('nexusleads-client-id');
                    if (!cid) {
                        cid = 'client-' + Math.random().toString(36).substring(2) + Date.now().toString(36);
                        localStorage.setItem('nexusleads-client-id', cid);
                    }
                    this.clientId = cid;
                    if (this.authToken) {
                        try {
                            const meRes = await fetch(this.apiBase + '/api/auth/me', {
                                headers: { 'Authorization': 'Bearer ' + this.authToken }
                            });
                            const meData = await meRes.json();
                            if (meData.success && meData.user) {
                                this.currentUser = meData.user;
                                await this.loadAccountStatus();
                                this.loadWorkspace();
                            } else {
                                this.authToken = '';
                                localStorage.removeItem('nexusleads-token');
                            }
                        } catch {
                            this.authToken = '';
                        }
                    }
                    try {
                        const headers = { 'X-Nexus-Client-ID': this.clientId };
                        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
                        const res = await fetch(this.apiBase + '/api/usage', { headers });
                        const data = await res.json();
                        if (data.success && data.credits) {
                            this.credits = data.credits;
                            if (data.user) this.currentUser = data.user;
                        }
                    } catch (e) {
                        console.warn('Could not load daily credits', e);
                    }
                    await this.loadReviews();
                    this.maybeShowNewsletterPopup();
                },
                async loadReviews() {
                    try {
                        const res = await fetch(this.apiBase + '/api/reviews');
                        const data = await res.json();
                        if (res.ok && data.success) this.reviews = data.reviews || [];
                    } catch (error) {
                        console.warn('Could not load public reviews.');
                    }
                },
                maybeShowSuccessPopup() {
                    if (localStorage.getItem('nexusleads-success-popup-shown') === '1') return;
                    localStorage.setItem('nexusleads-success-popup-shown', '1');
                    this.newsletterEmail = this.currentUser?.email || '';
                    this.showSuccessPopup = true;
                },
                dismissSuccessPopup() {
                    this.showSuccessPopup = false;
                },
                maybeShowNewsletterPopup() {
                    if (localStorage.getItem('nexusleads-newsletter-popup-shown') === '1') return;
                    window.setTimeout(() => {
                        if (!this.showSuccessPopup && !this.showAuthModal) this.showNewsletterPopup = true;
                    }, 6500);
                },
                dismissNewsletterPopup() {
                    localStorage.setItem('nexusleads-newsletter-popup-shown', '1');
                    this.showNewsletterPopup = false;
                },
                openReviewModal() {
                    if (!this.authToken || !this.currentUser) {
                        this.showSuccessPopup = false;
                        this.authMode = 'login';
                        this.showAuthModal = true;
                        this.message = 'Log in to publish a public client review.';
                        return;
                    }
                    this.showSuccessPopup = false;
                    this.reviewName = this.reviewName || this.currentUser.email.split('@')[0];
                    this.showReviewModal = true;
                },
                async submitNewsletter() {
                    this.newsletterSubmitting = true;
                    this.newsletterStatus = '';
                    try {
                        const headers = { 'Content-Type': 'application/json' };
                        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
                        const res = await fetch(this.apiBase + '/api/newsletter', { method: 'POST', headers, body: JSON.stringify({ email: this.newsletterEmail, source: this.showNewsletterPopup ? 'newsletter_popup' : 'successful_collection_popup' }) });
                        const data = await res.json();
                        if (!res.ok || !data.success) throw new Error(data.error || 'Newsletter signup failed.');
                        this.newsletterStatus = data.message || 'You are subscribed.';
                        this.track('newsletter_subscribe', { source: this.showNewsletterPopup ? 'newsletter_popup' : 'successful_collection_popup' });
                        this.newsletterEmail = '';
                        if (this.showNewsletterPopup) this.dismissNewsletterPopup();
                    } catch (error) {
                        this.newsletterStatus = error.message;
                    } finally {
                        this.newsletterSubmitting = false;
                    }
                },
                async submitReview() {
                    if (!this.authToken) { this.openReviewModal(); return; }
                    this.reviewSubmitting = true;
                    this.reviewError = '';
                    try {
                        const res = await fetch(this.apiBase + '/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authToken }, body: JSON.stringify({ display_name: this.reviewName, role: this.reviewRole, rating: Number(this.reviewRating), message: this.reviewMessage }) });
                        const data = await res.json();
                        if (!res.ok || !data.success) throw new Error(data.error || 'Review submission failed.');
                        if (data.review) this.reviews = [data.review, ...this.reviews];
                        this.showReviewModal = false;
                        this.reviewMessage = '';
                        this.message = 'Thank you. Your review is now visible in Client Voice.';
                        this.track('review_submitted', { rating: Number(this.reviewRating) });
                    } catch (error) {
                        this.reviewError = error.message;
                    } finally {
                        this.reviewSubmitting = false;
                    }
                },
                formatReviewDate(value) {
                    if (!value) return '';
                    try { return new Date(value).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }); } catch { return ''; }
                },
                async loadAccountStatus() {
                    if (!this.authToken) return;
                    try {
                        const res = await fetch(this.apiBase + '/api/account/credentials', { headers: { 'Authorization': 'Bearer ' + this.authToken } });
                        const data = await res.json();
                        if (res.ok && data.success) this.serviceAccountEmail = data.service_account_email || this.serviceAccountEmail;
                    } catch (error) {
                        console.warn('Could not load account configuration.');
                    }
                },
                async submitAuth() {
                    this.authLoading = true;
                    this.authError = '';
                    const endpoint = this.authMode === 'login' ? '/api/auth/login' : '/api/auth/signup';
                    try {
                        const res = await fetch(this.apiBase + endpoint, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ email: this.authEmail, password: this.authPassword })
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) throw new Error(data.error || 'Authentication failed.');
                        this.authToken = data.token;
                        localStorage.setItem('nexusleads-token', data.token);
                        this.currentUser = data.user;
                        await this.loadAccountStatus();
                        this.loadWorkspace();
                        this.showAuthModal = false;
                        this.authPassword = '';
                        this.message = 'Successfully logged in as ' + data.user.email;
                        this.track(this.authMode === 'login' ? 'login' : 'sign_up', { plan: data.user.plan || 'free', auth_method: 'email_password' });
                        await this.initApp();
                    } catch (err) {
                        this.authError = err.message;
                        this.track('auth_failed', { mode: this.authMode, reason: 'request_rejected' });
                    } finally {
                        this.authLoading = false;
                    }
                },
                async logout() {
                    try {
                        if (this.authToken) {
                            await fetch(this.apiBase + '/api/auth/logout', {
                                method: 'POST',
                                headers: { 'Authorization': 'Bearer ' + this.authToken }
                            });
                        }
                    } catch {}
                    this.authToken = '';
                    this.currentUser = null;
                    localStorage.removeItem('nexusleads-token');
                    this.track('logout', {});
                    this.message = 'Logged out successfully.';
                },
                async checkSheetAccess() {
                    if (!this.sheetId.trim()) {
                        alert('Please enter a Google Sheet URL or ID first.');
                        return;
                    }
                    this.sheetChecking = true;
                    try {
                        const headers = { 'Content-Type': 'application/json', 'X-Nexus-Client-ID': this.clientId };
                        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
                        const res = await fetch(this.apiBase + '/api/account/sheet-check', {
                            method: 'POST',
                            headers,
                            body: JSON.stringify({ sheet_id: this.sheetId })
                        });
                        const data = await res.json();
                        if (res.ok && data.verified) {
                            this.serviceAccountEmail = data.service_account_email || this.serviceAccountEmail;
                            alert('Success! Google Sheet is accessible by ' + this.serviceAccountEmail + '.');
                            this.track('sheet_access_verified', { verified: true });
                        } else {
                            this.serviceAccountEmail = data.service_account_email || this.serviceAccountEmail;
                            alert(data.error || 'Sheet not accessible. Please add ' + this.serviceAccountEmail + ' as an Editor.');
                            this.track('sheet_access_verified', { verified: false });
                        }
                    } catch (err) {
                        alert('Could not verify sheet access: ' + err.message);
                    } finally {
                        this.sheetChecking = false;
                    }
                },
                async saveMapsByok() {
                    if (!this.authToken) {
                        alert('Please log in before saving BYOK keys.');
                        this.showByokModal = false;
                        this.showAuthModal = true;
                        return;
                    }
                    try {
                        const res = await fetch(this.apiBase + '/api/account/credentials', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + this.authToken },
                            body: JSON.stringify({ 
                                maps_api_key: this.byokMapsKey, 
                                gemini_api_key: this.byokGeminiKey,
                                sheets_service_account_json: this.byokServiceJson 
                            })
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                            this.serviceAccountEmail = data.service_account_email || this.serviceAccountEmail;
                            if (data.credentials) {
                                this.credits.byok = {
                                    maps: Boolean(data.credentials.maps_configured),
                                    gemini: Boolean(data.credentials.gemini_configured),
                                    service_account: Boolean(data.credentials.sheets_configured)
                                };
                            }
                            this.showByokSuccess = true;
                            setTimeout(() => { this.showByokSuccess = false; }, 4000);
                            this.track('byok_credentials_saved', { 
                                maps_key_provided: Boolean(this.byokMapsKey), 
                                gemini_key_provided: Boolean(this.byokGeminiKey),
                                sheets_credentials_provided: Boolean(this.byokServiceJson) 
                            });
                            this.byokMapsKey = '';
                            this.byokGeminiKey = '';
                            this.byokServiceJson = '';
                        } else {
                            alert(data.error || 'Failed to save credentials.');
                        }
                    } catch (err) {
                        alert('Failed to save credentials: ' + err.message);
                    }
                },
                toggleAutoPush(enabled) {
                    if (enabled && !this.sheetId.trim()) {
                        this.autoPushEnabled = false;
                        this.message = 'Auto-Push stayed disconnected because no Google Sheet is configured.';
                        this.track('sheet_auto_push_toggled', { enabled: false, reason: 'missing_sheet' });
                        return;
                    }
                    this.autoPushEnabled = Boolean(enabled);
                    this.saveSheetConfig();
                    this.metrics.sheet = this.autoPushEnabled ? 'Connected' : 'Disconnected';
                    this.message = this.autoPushEnabled ? 'Auto-Push connected. New successful searches will sync to your configured Sheet.' : 'Auto-Push disconnected. Nothing will be sent automatically; select rows and use Push Selected Batch.';
                    this.track('sheet_auto_push_toggled', { enabled: this.autoPushEnabled });
                },
                workspaceKey() {
                    const identity = this.currentUser?.id || this.currentUser?.email;
                    return identity ? 'nexusleads-workspace-' + identity : '';
                },
                loadWorkspace() {
                    const key = this.workspaceKey();
                    if (!key) return;
                    try {
                        const saved = JSON.parse(localStorage.getItem(key) || '{}');
                        if (Array.isArray(saved.leads)) this.leads = saved.leads.map(lead => ({ ...lead, selected: Boolean(lead.selected) }));
                        if (saved.metrics && typeof saved.metrics === 'object') this.metrics = { ...this.metrics, ...saved.metrics };
                        this.workspaceSavedAt = saved.savedAt || '';
                        if (this.leads.length) {
                            this.metrics.found = this.leads.length;
                            this.metrics.verified = this.leads.filter(lead => lead.phone && lead.email).length;
                            this.metrics.emails = this.leads.filter(lead => lead.email).length;
                        }
                    } catch (error) {
                        console.warn('Saved lead workspace could not be loaded.');
                    }
                },
                persistWorkspace() {
                    const key = this.workspaceKey();
                    if (!key) return;
                    try {
                        const savedAt = new Date().toISOString();
                        localStorage.setItem(key, JSON.stringify({ leads: this.leads.slice(-500), metrics: this.metrics, savedAt }));
                        this.workspaceSavedAt = savedAt;
                    } catch (error) {
                        this.message = 'The browser could not save the full lead workspace. Download a CSV before clearing the page.';
                        console.warn('Lead workspace could not be persisted locally.', error);
                    }
                },
                clearWorkspace() {
                    if (!window.confirm('Clear all saved leads and dashboard results for this account? This does not delete your Google Sheet.')) return;
                    const key = this.workspaceKey();
                    if (key) localStorage.removeItem(key);
                    this.leads = [];
                    this.metrics = { found: 0, verified: 0, emails: 0, sheet: 'Waiting' };
                    this.progress = 0;
                    this.stage = 0;
                    this.workspaceSavedAt = '';
                    this.message = 'Now you clear all: Dashboard lead data cleared. Your Google Sheet was not changed.';
                    this.track('workspace_cleared', {});
                },
                async clearAllUserData() {
                    if (!window.confirm('Clear encrypted BYOK keys, saved Sheet settings, and all dashboard leads for this account? This does not delete the Google Sheet itself.')) return;
                    try {
                        if (this.authToken) {
                            const response = await fetch(this.apiBase + '/api/account/credentials', { method: 'DELETE', headers: { 'Authorization': 'Bearer ' + this.authToken } });
                            const data = await response.json().catch(() => ({}));
                            if (!response.ok || !data.success) throw new Error(data.error || 'Encrypted credential clearing failed.');
                        }
                        const key = this.workspaceKey();
                        if (key) localStorage.removeItem(key);
                        localStorage.removeItem('nexusleads-sheet-config');
                        this.byokMapsKey = '';
                        this.byokGeminiKey = '';
                        this.byokServiceJson = '';
                        this.sheetId = '';
                        this.autoPushEnabled = false;
                        this.leads = [];
                        this.metrics = { found: 0, verified: 0, emails: 0, sheet: 'Disconnected' };
                        this.showByokModal = false;
                        this.message = 'All saved account data was cleared. BYOK is disconnected and the dashboard is empty.';
                        this.track('account_data_cleared', {});
                    } catch (error) {
                        this.message = error.message || 'Could not clear account data.';
                    }
                },
                async openByok() {
                    if (!this.currentUser) {
                        this.authMode = 'login';
                        this.showAuthModal = true;
                        this.message = 'Please log in to configure BYOK API keys.';
                        return;
                    }
                    
                    // Refresh user status from server to check for manual activation
                    try {
                        const headers = { 'X-Nexus-Client-ID': this.clientId };
                        if (this.authToken) headers['Authorization'] = 'Bearer ' + this.authToken;
                        const res = await fetch(this.apiBase + '/api/usage', { headers });
                        const data = await res.json();
                        if (data.success && data.user) {
                            this.currentUser = data.user;
                        }
                    } catch (e) {
                        console.warn('Could not refresh account status', e);
                    }

                    if (!this.currentUser.is_paid) {
                        this.showPricingModal = true;
                        this.message = 'BYOK API configuration requires an activated paid plan ($3, $5, or $10 via PayPal at paypal.me/Connectwithbayezid). Once paid, the admin will enable your account.';
                        return;
                    }
                    this.showByokModal = true;
                    await this.loadAccountStatus();
                },
                get tierLabel() {
                    if (!this.currentUser) return '';
                    if (this.currentUser.is_paid) {
                        if (this.credits.byok?.maps) return 'Now you use your BOYOK';
                        return 'Now you use our PRO Status';
                    }
                    return 'Now you use our FREE Tier';
                },
                get tierBadge() {
                    if (!this.currentUser) return '';
                    if (this.currentUser.is_paid) {
                        if (this.credits.byok?.maps) return 'BOYOK';
                        return 'PRO';
                    }
                    return 'FREE';
                },
                loadSheetConfig() {
                    try {
                        const saved = JSON.parse(localStorage.getItem('nexusleads-sheet-config') || '{}');
                        if (typeof saved.sheetId === 'string') this.sheetId = saved.sheetId;
                        if ([20, 25, 30, 40, 50].includes(Number(saved.maxResults))) this.maxResults = Number(saved.maxResults);
                        if ([50, 100, 200].includes(Number(saved.pushBatchSize))) this.pushBatchSize = Number(saved.pushBatchSize);
                        if (typeof saved.autoPush === 'boolean') this.autoPushEnabled = saved.autoPush;
                        else if (typeof saved.enabled === 'boolean') this.autoPushEnabled = saved.enabled;
                    } catch (error) {
                        console.warn('Saved Google Sheets configuration could not be loaded.');
                    }
                },
                saveSheetConfig() {
                    try {
                        localStorage.setItem('nexusleads-sheet-config', JSON.stringify({ sheetId: this.sheetId, autoPush: this.autoPushEnabled, maxResults: Number(this.maxResults), pushBatchSize: Number(this.pushBatchSize) }));
                    } catch (error) {
                        console.warn('Google Sheets configuration could not be saved locally.');
                    }
                },
                allSelected() {
                    return this.leads.length > 0 && this.leads.every(lead => lead.selected);
                },
                selectedCount() {
                    return this.leads.filter(lead => lead.selected).length;
                },
                toggleAll(checked) {
                    this.leads.forEach(lead => { lead.selected = checked; });
                    this.persistWorkspace();
                },
                async syncSelected() {
                    const selected = this.leads.filter(lead => lead.selected);
                    if (!selected.length) {
                        this.message = 'Select at least one lead before syncing.';
                        return;
                    }
                    if (!this.sheetId.trim()) {
                        this.message = 'Paste your Google Sheet URL before syncing selected leads.';
                        return;
                    }
                    const batchSize = Math.min(200, Math.max(50, Number(this.pushBatchSize) || 50));
                    const batch = selected.slice(0, batchSize);
                    this.manualPushLoading = true;
                    this.message = `Syncing ${batch.length} selected lead(s) in ${Math.ceil(batch.length / 50)} API-safe batch(es) to the Leads and Outreach tabs...`;
                    try {
                        const data = await this.postJson('/api/export', {
                            sheet_id: this.sheetId,
                            leads: batch,
                            leads_sheet_tab: 'Leads',
                            outreach_sheet_tab: 'Outreach'
                        });
                        // postJson already handles error throwing for response.ok and data.success
                        batch.forEach(lead => { lead.selected = false; lead.synced = true; lead.synced_at = new Date().toISOString(); });
                        this.persistWorkspace();
                        this.metrics.sheet = 'Synced';
                        const remainder = selected.length - batch.length;
                        this.message = `Selected leads synced: ${data.count} lead(s) to Leads and Outreach.${remainder > 0 ? ` ${remainder} selected lead(s) remain ready for the next batch.` : ''}`;
                        this.track('selected_leads_synced', { lead_count: Number(data.count) || batch.length, batch_size: batchSize });
                        this.activity.unshift({ time: new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}), text: this.message });
                    } catch (error) {
                        this.message = error.message || 'Selected sync failed.';
                        this.track('selected_leads_sync_failed', { lead_count: selected.length });
                        this.metrics.sheet = 'Failed';
                    } finally {
                        this.manualPushLoading = false;
                    }
                },
                async copyText(value) {
                    if (!value) return;
                    try {
                        await navigator.clipboard.writeText(value);
                        this.message = 'Draft copied to clipboard. Review it before sending.';
                    } catch {
                        this.message = 'Copy was blocked by the browser. Select the draft from the Google Sheet instead.';
                    }
                },
                exportCSV(selectedOnly = false) {
                    const exportLeads = selectedOnly ? this.leads.filter(lead => lead.selected) : this.leads;
                    if (!exportLeads.length) {
                        this.message = selectedOnly ? 'Select at least one lead before downloading the selected CSV.' : 'There are no leads to download.';
                        return;
                    }
                    const cell = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
                    let csv = ['Name','Category','Phone','Email','Facebook','Instagram','Twitter','LinkedIn','Draft Type','Address','Website','Rating','Verification','Email Subject Draft','Email Message Draft','WhatsApp Message Draft','Personalization Note','Synced'].map(cell).join(',') + '\\n';
                    exportLeads.forEach(l => {
                        csv += [l.name, l.category, l.phone, l.email, l.facebook, l.instagram, l.twitter, l.linkedin, l.draft_type, l.address, l.website, l.rating, l.verification, l.email_subject, l.email_draft, l.whatsapp_draft, l.personalization_note, l.synced ? 'Yes' : 'No'].map(cell).join(',') + '\\n';
                    });
                    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = selectedOnly ? 'nexusleads-selected.csv' : 'nexusleads-all-leads.csv';
                    document.body.appendChild(a);
                    a.click();
                    a.remove();
                    window.URL.revokeObjectURL(url);
                    this.track('leads_csv_downloaded', { selected_only: selectedOnly, count: exportLeads.length });
                }
            }
        }
