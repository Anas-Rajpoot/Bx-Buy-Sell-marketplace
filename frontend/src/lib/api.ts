// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
// Bearer token for API authorization - used when user is not logged in
const API_BEARER_TOKEN = import.meta.env.VITE_API_BEARER_TOKEN || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU1NjU4YzI1LTdiYTktNDYzYi1iMmE4LWRlNzZjM2M3MDg4MiIsImZpcnN0X25hbWUiOiJoZWxsbyIsImxhc3RfbmFtZSI6InJhbyIsImVtYWlsIjoicm1mYnVzaW5lc3MxOTIwQGdtYWlsLmNvbSIsImJ1c2luZXNzX25hbWUiOm51bGwsImNvbnRhY3RfbmFtZSI6bnVsbCwicGhvbmUiOm51bGwsImNvdW50cnlfY29kZSI6bnVsbCwiYWRkcmVzcyI6bnVsbCwiY291bnRyeSI6bnVsbCwicGVybWlzc2lvbnMiOltdLCJyb2xlIjoiQURNSU4iLCJjaXR5IjpudWxsLCJzdGF0ZSI6bnVsbCwib3RwX2NvZGUiOiI5ODk5IiwicHJvZmlsZV9waWMiOm51bGwsImlzX29ubGluZSI6dHJ1ZSwiemlwX2NvZGUiOm51bGwsImJhY2tncm91bmQiOm51bGwsImlzX2VtYWlsX3ZlcmlmaWVkIjp0cnVlLCJpc19waG9uZV92ZXJpZmllZCI6ZmFsc2UsInZlcmlmaWVkIjp0cnVlLCJjcmVhdGVkX2F0IjoiMjAyNS0wNy0xMVQwNzo1NTozMy4xODRaIiwidXBkYXRlZF9hdCI6IjIwMjUtMTItMDhUMDg6NTc6MTcuMzgyWiIsImRlbGV0ZWRfYXQiOm51bGwsImNoYXRSb29tSWQiOm51bGwsImlhdCI6MTc2NTE5MDIxMCwiZXhwIjoxNzY1MjE1NDEwfQ.DH_PaVTgZ_u81JTKDfgmR5gmZk1SHDwQxGqviU0QkIg';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private bearerToken: string;

  constructor(baseUrl: string, bearerToken: string = '') {
    this.baseUrl = baseUrl;
    this.bearerToken = bearerToken;
    this.loadToken();
  }

  private loadToken() {
    this.token = localStorage.getItem('auth_token');
    // Also ensure bearer token is set if we have a user token
    if (this.token) {
      this.setBearerToken(this.token);
    }
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  setBearerToken(bearerToken: string) {
    this.bearerToken = bearerToken;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    // Always use direct backend connection - no proxy
    // Always reload token from localStorage to ensure we have the latest
    const storedToken = localStorage.getItem('auth_token');
    if (storedToken && storedToken !== this.token) {
      this.token = storedToken;
      this.setBearerToken(storedToken);
    }
    
    // Use user's auth token if available, otherwise use static bearer token
    const userAuthToken = this.token || storedToken;
    const finalBearerToken = userAuthToken || this.bearerToken || API_BEARER_TOKEN;
    
    if (!finalBearerToken) {
      console.error('CRITICAL: No bearer token available!');
      return {
        success: false,
        error: 'Authentication error: Bearer token is missing',
      };
    }
    
    // Decode token to show user info for debugging
    let tokenUserInfo = null;
    if (userAuthToken && userAuthToken.includes('.')) {
      try {
        const payload = JSON.parse(atob(userAuthToken.split('.')[1]));
        tokenUserInfo = {
          userId: payload.id,
          email: payload.email,
          role: payload.role,
          exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null
        };
      } catch (e) {
        // Ignore decode errors
      }
    }
    
    // Extract query params from endpoint
    const [path, queryString] = endpoint.split('?');
    const queryParams = queryString ? `?${queryString}` : '';
    const url = `${API_BASE_URL}${path}${queryParams}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${finalBearerToken}`,
      ...options.headers,
    };
    
    console.log(`🌐 API Request DIRECT to backend: ${path}`, { 
      url: url,
      hasUserToken: !!userAuthToken,
      hasBearerToken: !!finalBearerToken, 
      bearerTokenLength: finalBearerToken?.length,
      bearerTokenPreview: finalBearerToken ? finalBearerToken.substring(0, 50) + '...' : 'MISSING',
      usingUserToken: !!userAuthToken,
      tokenUserInfo: tokenUserInfo
    });
    
    try {
      const response = await fetch(url, {
        method: options.method || 'GET',
        headers,
        body: options.body,
      });

      console.log(`📥 API Response Status: ${response.status} ${response.statusText}`);

      let data;
      try {
        const text = await response.text();
        console.log('📥 API Response Raw (first 500 chars):', text.substring(0, 500));
        data = JSON.parse(text);
        console.log('📥 API Response Parsed:', data);
        
        // Log authorization issues specifically
        if (response.status === 401 || response.status === 403) {
          console.error('❌ AUTHORIZATION ERROR:', {
            status: response.status,
            statusText: response.statusText,
            responseData: data,
            endpoint: path,
            bearerTokenUsed: finalBearerToken ? 'YES' : 'NO',
            bearerTokenLength: finalBearerToken?.length
          });
        }
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        return {
          success: false,
          error: 'Invalid JSON response from server',
        };
      }

      if (!response.ok) {
        console.error('API Error Details:', {
          status: response.status,
          statusText: response.statusText,
          endpoint: path,
          fullUrl: url,
          method: options.method || 'GET',
          responseData: data,
          bearerTokenUsed: finalBearerToken ? 'Yes' : 'No',
          bearerTokenLength: finalBearerToken?.length,
          requestBody: options.body
        });
        
        // Special handling for 404 errors
        if (response.status === 404) {
          console.error('❌ 404 NOT FOUND - Route does not exist:', {
            endpoint: path,
            fullUrl: url,
            method: options.method || 'GET',
            possibleCauses: [
              'Backend server needs to be restarted',
              'Route not registered in backend',
              'Module not imported in app.module.ts',
              'Controller path mismatch',
              'Backend code not deployed/compiled'
            ]
          });
        }
        
        // Handle 401 Unauthorized specifically
        if (response.status === 401) {
          // Don't auto-logout for auth endpoints (login/signup) - 401 is expected for invalid credentials
          const isAuthEndpoint = path.startsWith('/auth/signin') || path.startsWith('/auth/signup') || path.startsWith('/auth/verify-otp');
          
          // Don't auto-logout if we just logged in (within last 30 seconds)
          // This gives more time for the backend to sync/validate the token
          const lastLoginTime = localStorage.getItem('last_login_time');
          const justLoggedIn = lastLoginTime && (Date.now() - parseInt(lastLoginTime)) < 30000;
          
          if (isAuthEndpoint) {
            // For auth endpoints, 401 is normal for invalid credentials - don't clear session
            console.log('401 on auth endpoint - this is expected for invalid credentials');
          } else if (justLoggedIn) {
            // Don't logout immediately after login - might be a timing issue
            console.warn('401 received shortly after login - not logging out to prevent race condition');
            console.warn('This might indicate:');
            console.warn('1. Backend JWT_SECRET mismatch (token signed with different secret)');
            console.warn('2. User account might be blocked/inactive');
            console.warn('3. Token signature verification failed');
            console.warn('4. Backend expects different token format');
            console.warn('5. Backend needs time to sync token validation');
            // Don't clear session yet - give it more time
            // Return error but don't logout
            return {
              success: false,
              error: 'Authentication error. The backend may need a moment to validate your session. Please try again in a few seconds.',
            };
          } else {
            // For other endpoints, 401 means session expired
            console.error('401 Unauthorized - Token may be expired or invalid');
            console.error('Token preview:', finalBearerToken ? finalBearerToken.substring(0, 100) + '...' : 'MISSING');
            
            // Try to decode JWT to check expiration and get user info
            if (finalBearerToken && finalBearerToken.includes('.')) {
              try {
                const payload = JSON.parse(atob(finalBearerToken.split('.')[1]));
                const exp = payload.exp;
                const now = Math.floor(Date.now() / 1000);
                console.error('Token Details:', {
                  userId: payload.id,
                  email: payload.email,
                  role: payload.role,
                  exp: exp ? new Date(exp * 1000).toISOString() : 'No expiration',
                  currentTime: new Date().toISOString(),
                  isExpired: exp ? exp < now : false,
                  expiredSecondsAgo: exp && exp < now ? now - exp : 0
                });
                
                if (exp && exp < now) {
                  console.error('Token is EXPIRED!', {
                    expiredAt: new Date(exp * 1000).toISOString(),
                    currentTime: new Date().toISOString(),
                    expiredSecondsAgo: now - exp
                  });
                } else if (exp) {
                  console.log('Token is valid until:', new Date(exp * 1000).toISOString());
                  console.warn('Token appears valid but backend rejected it. Possible causes:');
                  console.warn('1. JWT_SECRET mismatch between sign and verify');
                  console.warn('2. User account might be blocked or inactive');
                  console.warn('3. Token signature verification failed');
                  console.warn('4. Backend expects different token format');
                }
              } catch (e) {
                console.error('Could not decode token:', e);
              }
            }
            
            // Clear token and user data on 401 (only for non-auth endpoints and not immediately after login)
            this.clearToken();
            localStorage.removeItem('user_data');
            localStorage.removeItem('bearer_token');
            
            // Dispatch event to notify auth hook
            window.dispatchEvent(new CustomEvent('auth:logout', { detail: { reason: 'unauthorized' } }));
            
            // Redirect to login if not already there
            if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
              setTimeout(() => {
                window.location.href = '/login';
              }, 1000);
            }
          }
        }
        
        // Extract error message from various response formats
        let errorMessage = `API Error: ${response.status}`;
        if (data) {
          if (typeof data === 'string') {
            errorMessage = data;
          } else if (data.error) {
            errorMessage = typeof data.error === 'string' 
              ? data.error 
              : (data.error.message || JSON.stringify(data.error));
          } else if (data.message) {
            errorMessage = typeof data.message === 'string' 
              ? data.message 
              : (data.message.message || JSON.stringify(data.message));
          }
        }
        
        // Add specific messages for common errors
        if (response.status === 401) {
          errorMessage = 'Unauthorized: Your session may have expired. Please log in again.';
        } else if (response.status === 404) {
          errorMessage = `Route not found: ${path}. The backend endpoint may not be available. Please ensure the backend server is running and the route is registered.`;
        } else if (response.status === 405) {
          errorMessage = `Method not allowed: ${options.method || 'GET'} is not allowed for ${path}.`;
        }
        
        return {
          success: false,
          error: errorMessage,
        };
      }

      // Handle different response formats
      // Backend might return: { data: [...] } or directly [...]
      let responseData = data;
      if (data && typeof data === 'object') {
        if (Array.isArray(data)) {
          // Direct array response: [...]
          responseData = data;
          console.log('Detected direct array response, length:', data.length);
        } else if (data.data !== undefined) {
          // Wrapped in { data: [...] } - data can be null
          responseData = data.data;
          console.log('Detected wrapped response with data field, length:', Array.isArray(data.data) ? data.data.length : data.data === null ? 'null' : 'not array');
        } else if (data.status === 'success') {
          // Wrapped in { status: 'success', data: [...] } - data can be null
          responseData = data.data;
          console.log('Detected success status response, length:', Array.isArray(data.data) ? data.data.length : data.data === null ? 'null' : 'not array');
        } else {
          // Return the object as-is
          responseData = data;
          console.log('Returning object as-is');
        }
      }

      console.log('Final response data:', {
        isArray: Array.isArray(responseData),
        length: Array.isArray(responseData) ? responseData.length : 'N/A',
        type: typeof responseData,
      });

      return {
        success: true,
        data: responseData,
      };
    } catch (error) {
      console.error('API request failed:', error);
      
      // Detect if backend server is not running
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      let userFriendlyError = errorMessage;
      
      // Check for common connection errors
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('NetworkError') ||
          errorMessage.includes('ERR_CONNECTION_REFUSED') ||
          errorMessage.includes('ECONNREFUSED')) {
        userFriendlyError = `Backend server is not running. Please start the backend server on ${API_BASE_URL}. Run: cd ex-buy-sell-apis && npm run start:dev`;
        console.error('❌ BACKEND SERVER NOT RUNNING:', {
          attemptedUrl: url,
          baseUrl: API_BASE_URL,
          endpoint: path,
          error: errorMessage,
          solution: 'Start the backend server: cd ex-buy-sell-apis && npm run start:dev'
        });
      }
      
      return {
        success: false,
        error: userFriendlyError,
      };
    }
  }

  // Auth endpoints
  async signUp(userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    confirm_password: string;
    user_type?: string;
  }) {
    const response = await this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
    
    // Store token if signup successful
    if (response.success && response.data) {
      const data = response.data as any;
      if (data.tokens?.accessToken) {
        const accessToken = data.tokens.accessToken;
        this.setToken(accessToken);
        // Also update bearer token to use the user's access token
        this.setBearerToken(accessToken);
        console.log('Signup successful - Token stored and set as bearer token');
        
        // Store timestamp to prevent immediate logout on 401
        localStorage.setItem('last_login_time', Date.now().toString());
        
        // Also store user data
        if (data.user) {
          localStorage.setItem('user_data', JSON.stringify(data.user));
        }
      }
    }
    
    return response;
  }

  async signIn(credentials: { email: string; password: string }) {
    console.log('🔐 Attempting login for:', credentials.email);
    const response = await this.request('/auth/signin', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
    
    // Store token if login successful
    if (response.success && response.data) {
      const data = response.data as any;
      console.log('🔐 Login response:', {
        success: response.success,
        hasData: !!data,
        hasTokens: !!data.tokens,
        hasAccessToken: !!data.tokens?.accessToken,
        hasUser: !!data.user,
        error: response.error
      });
      
      if (data.tokens?.accessToken) {
        const accessToken = data.tokens.accessToken;
        this.setToken(accessToken);
        // Also update bearer token to use the user's access token
        this.setBearerToken(accessToken);
        
        // Decode token to show user info
        try {
          const payload = JSON.parse(atob(accessToken.split('.')[1]));
          console.log('✅ Login successful! Token details:', {
            userId: payload.id,
            email: payload.email,
            role: payload.role,
            exp: payload.exp ? new Date(payload.exp * 1000).toISOString() : null,
            tokenLength: accessToken.length,
            tokenPreview: accessToken.substring(0, 50) + '...'
          });
        } catch (e) {
          console.log('✅ Login successful! Token stored (could not decode)', {
            tokenLength: accessToken.length
          });
        }
        
        // Store timestamp to prevent immediate logout on 401
        localStorage.setItem('last_login_time', Date.now().toString());
        
        // Also store user data
        if (data.user) {
          localStorage.setItem('user_data', JSON.stringify(data.user));
          console.log('✅ User data stored:', {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role
          });
        }
      } else {
        console.error('❌ Login failed: No access token in response', response.error || 'Unknown error');
      }
    } else {
      console.error('❌ Login failed:', response.error || 'Unknown error');
    }
    
    return response;
  }

  // Listing endpoints
  async createListing(listingData: any) {
    return this.request('/listing', {
      method: 'POST',
      body: JSON.stringify(listingData),
    });
  }

  async getListings(params?: {
    page?: number;
    limit?: number;
    category?: string;
    status?: string;
    nocache?: string;
  }) {
    const queryParams = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          queryParams.append(key, String(value));
        }
      });
    }
    const query = queryParams.toString();
    return this.request(`/listing${query ? `?${query}` : ''}`);
  }

  async getListingById(id: string, nocache?: boolean) {
    const url = nocache ? `/listing/${id}?nocache=true` : `/listing/${id}`;
    return this.request(url);
  }

  async updateListing(id: string, listingData: any) {
    return this.request(`/listing/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(listingData),
    });
  }

  async deleteListing(id: string) {
    return this.request(`/listing/${id}`, {
      method: 'DELETE',
    });
  }

  // Categories endpoint
  async getCategories() {
    return this.request('/category');
  }

  async createCategory(categoryData: { name: string; image_path?: string }) {
    return this.request('/category', {
      method: 'POST',
      body: JSON.stringify(categoryData),
    });
  }

  async updateCategory(id: string, categoryData: { name?: string; image_path?: string }) {
    return this.request(`/category/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(categoryData),
    });
  }

  async deleteCategory(id: string) {
    return this.request(`/category/${id}`, {
      method: 'DELETE',
    });
  }

  // Tools endpoints
  async getTools() {
    return this.request('/service-tool');
  }

  async createTool(toolData: { 
    name: string; 
    image_path: string;
  }) {
    return this.request('/service-tool', {
      method: 'POST',
      body: JSON.stringify(toolData),
    });
  }

  async updateTool(id: string, toolData: { 
    name?: string; 
    image_path?: string;
  }) {
    return this.request(`/service-tool/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(toolData),
    });
  }

  async deleteTool(id: string) {
    return this.request(`/service-tool/${id}`, {
      method: 'DELETE',
    });
  }

  // Prohibited Words endpoints
  async getProhibitedWords() {
    return this.request('/prohibited-word/');
  }

  async getProhibitedWordById(id: string) {
    return this.request(`/prohibited-word/${id}`);
  }

  async createProhibitedWord(wordData: { word: string }) {
    return this.request('/prohibited-word', {
      method: 'POST',
      body: JSON.stringify(wordData),
    });
  }

  async updateProhibitedWord(id: string, wordData: { word?: string; is_active?: boolean; category?: string }) {
    return this.request(`/prohibited-word/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(wordData),
    });
  }

  async deleteProhibitedWord(id: string) {
    return this.request(`/prohibited-word/${id}`, {
      method: 'DELETE',
    });
  }

  // Integrations endpoint
  async getIntegrations() {
    return this.request('/integration');
  }

  // Admin Questions endpoints
  async getAdminQuestions() {
    return this.request('/question-admin');
  }

  async getAdminQuestionsByType(type: string) {
    return this.request(`/question-admin/type/${type}`);
  }

  async createAdminQuestion(questionData: { 
    question: string; 
    answer_type: string;
    answer_for: string;
    option?: string[];
  }) {
    // Backend DTO expects 'options' (plural), not 'option' (singular)
    const payload: any = {
      question: questionData.question,
      answer_type: questionData.answer_type,
      answer_for: questionData.answer_for,
    };
    
    // Only include options if it's provided and not empty
    if (questionData.option && questionData.option.length > 0) {
      payload.options = questionData.option; // Send as 'options' to match DTO
    }
    
    console.log('createAdminQuestion called with:', payload);
    return this.request('/question-admin', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async updateAdminQuestion(id: string, questionData: { 
    question?: string; 
    answer_type?: string;
    answer_for?: string;
    option?: string[];
  }) {
    console.log('📤 updateAdminQuestion called:', { id, questionData });
    
    // Backend DTO expects 'options' (plural), not 'option' (singular)
    const payload: any = {};
    
    if (questionData.question !== undefined) payload.question = questionData.question;
    if (questionData.answer_type !== undefined) {
      payload.answer_type = questionData.answer_type;
      console.log('📤 Setting answer_type:', questionData.answer_type);
    }
    if (questionData.answer_for !== undefined) payload.answer_for = questionData.answer_for;
    
    // Include options if it's provided (even if empty array to clear options)
    if (questionData.option !== undefined) {
      payload.options = questionData.option; // Send as 'options' to match DTO
    }
    
    console.log('📤 Final payload:', payload);
    
    return this.request(`/question-admin/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  async deleteAdminQuestion(id: string) {
    return this.request(`/question-admin/${id}`, {
      method: 'DELETE',
    });
  }

  // Plan/Package endpoints
  async getPlans() {
    return this.request('/plan');
  }

  async getPlanById(id: string) {
    return this.request(`/plan/${id}`);
  }

  async createPlan(planData: {
    title: string;
    description: string;
    duration: string;
    type: string;
    price: string;
    features?: string[];
  }) {
    // Map frontend fields to backend DTO fields
    // Backend DTO expects 'duration' but Prisma schema uses 'duration_type'
    // Backend DTO expects 'features' but Prisma schema uses 'feature'
    // The backend service should handle this mapping, but we'll send what DTO expects
    const payload: any = {
      title: planData.title,
      description: planData.description,
      duration: planData.duration, // DTO field name
      type: planData.type,
      price: planData.price,
    };

    // Only include features if provided
    if (planData.features && planData.features.length > 0) {
      payload.features = planData.features; // DTO field name
    }

    console.log('📦 createPlan payload:', payload);
    console.log('📦 createPlan validation check:', {
      titleLength: payload.title?.length,
      descriptionLength: payload.description?.length,
      durationLength: payload.duration?.length,
      typeLength: payload.type?.length,
      priceLength: payload.price?.length,
      featuresCount: payload.features?.length || 0,
      allFieldsValid: payload.title?.length >= 4 && 
                     payload.description?.length >= 4 && 
                     payload.duration?.length >= 4 && 
                     payload.type?.length >= 4 && 
                     payload.price?.length >= 4
    });
    
    const response = await this.request('/plan', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    
    console.log('📦 createPlan response:', response);
    
    return response;
  }

  async updatePlan(id: string, planData: {
    title?: string;
    description?: string;
    duration?: string;
    type?: string;
    price?: string;
    features?: string[];
  }) {
    return this.request(`/plan/${id}`, {
      method: 'PUT',
      body: JSON.stringify(planData),
    });
  }

  async deletePlan(id: string) {
    return this.request(`/plan/${id}`, {
      method: 'DELETE',
    });
  }

  // Admin Social Account endpoints (following question-admin and financial-admin pattern)
  async getSocialAccounts() {
    return this.request('/admin-social-account');
  }

  async getSocialAccountById(id: string) {
    return this.request(`/admin-social-account/${id}`);
  }

  async createSocialAccount(accountData: { social_account_option: string }) {
    console.log('📤 createSocialAccount called with:', accountData);
    console.log('📤 Endpoint: /admin-social-account');
    console.log('📤 Method: POST');
    console.log('📤 Body:', JSON.stringify(accountData));
    
    const response = await this.request('/admin-social-account', {
      method: 'POST',
      body: JSON.stringify(accountData),
    });
    
    console.log('📥 createSocialAccount response:', response);
    return response;
  }

  async updateSocialAccount(id: string, accountData: { social_account_option: string }) {
    return this.request(`/admin-social-account/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(accountData),
    });
  }

  async deleteSocialAccount(id: string) {
    return this.request(`/admin-social-account/${id}`, {
      method: 'DELETE',
    });
  }

  // User endpoints
  async getAllUsers() {
    return this.request('/user');
  }

  async getUserById(id: string) {
    return this.request(`/user/${id}`);
  }

  async updateUser(id: string, userData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    address?: string;
    country?: string;
    city?: string;
    state?: string;
    zip_code?: string;
    profile_pic?: string;
    background?: string;
    business_name?: string;
    availability_status?: string;
    role?: string;
    verified?: boolean;
  }) {
    return this.request(`/user/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  async updateUserByAdmin(id: string, userData: {
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    role?: string;
    active?: boolean;
    availability_status?: string;
  }) {
    return this.request(`/user/update-by-admin/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData),
    });
  }

  async deleteUser(id: string) {
    return this.request(`/user/${id}`, {
      method: 'DELETE',
    });
  }

  async createUserByAdmin(userData: {
    first_name: string;
    last_name: string;
    email: string;
    password: string;
    confirm_password: string;
    role: 'ADMIN' | 'USER' | 'MONITER';
    active: boolean;
  }) {
    return this.request('/user/create-by-admin', {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  // Favorites endpoints
  async getFavorites() {
    return this.request('/user/favourite');
  }

  async addFavorite(listingId: string) {
    return this.request(`/user/favourite/add/${listingId}`, {
      method: 'GET',
    });
  }

  async removeFavorite(listingId: string) {
    return this.request(`/user/favourite/remove/${listingId}`, {
      method: 'GET',
    });
  }

  // Auth helper methods
  async getOTP(email: string) {
    return this.request(`/auth/get-otp/${email}`, {
      method: 'GET',
    });
  }

  async verifyOTP(data: { email: string; otp_code: string }) {
    return this.request('/auth/verify-otp', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async resetPassword(email: string) {
    return this.request(`/auth/reset-password/${email}`, {
      method: 'POST',
    });
  }

  async updatePassword(data: { email: string; otp_code: string; new_password: string; confirm_password: string }) {
    return this.request('/auth/update-password', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async logout(userId: string) {
    return this.request(`/auth/logout/${userId}`, {
      method: 'GET',
    });
  }

  // Chat message operations
  async markMessagesAsRead(chatId: string, userId: string) {
    return this.request(`/chat/mark-read/${chatId}/${userId}`, {
      method: 'PUT',
    });
  }

  // File upload
  async uploadFile(file: File, type: 'photo' | 'attachment') {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers,
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || 'Upload failed',
        };
      }

      return {
        success: true,
        data,
      };
    } catch (error) {
      console.error('File upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload error',
      };
    }
  }

  // Chat endpoints
  async getChatRoomsByUserId(userId: string) {
    return this.request(`/chat/fetch/user/${userId}`, {
      method: 'GET',
    });
  }

  async getChatRoomsBySellerId(sellerId: string) {
    return this.request(`/chat/fetch/seller/${sellerId}`, {
      method: 'GET',
    });
  }

  async getChatRoom(userId: string, sellerId: string, listingId?: string) {
    // CRITICAL: Include listingId as query parameter to scope chat to specific listing
    const url = listingId 
      ? `/chat/fetch/${userId}/${sellerId}?listingId=${listingId}`
      : `/chat/fetch/${userId}/${sellerId}`;
    return this.request(url, {
      method: 'GET',
    });
  }

  async createChatRoom(userId: string, sellerId: string, listingId?: string) {
    // CRITICAL: Include listingId as query parameter to create listing-specific chat
    const url = listingId 
      ? `/chat/create/${userId}/${sellerId}?listingId=${listingId}`
      : `/chat/create/${userId}/${sellerId}`;
    return this.request(url, {
      method: 'GET',
    });
  }

  async getChatCount(userId: string) {
    return this.request(`/chat/get-chat-count/${userId}`, {
      method: 'GET',
    });
  }

  async updateChatLabel(chatId: string, label: 'GOOD' | 'BAD' | 'MEDIUM', userId: string) {
    return this.request('/chat/update/label', {
      method: 'PUT',
      body: JSON.stringify({ chatId, label, userId }),
    });
  }

  // Removed: getAgoraToken - No longer using Agora, using WebRTC with WebSocket instead
  // This function is kept for backward compatibility but should not be used

  async deleteChat(chatId: string, userId: string) {
    return this.request(`/chat/delete/${chatId}/${userId}`, {
      method: 'DELETE',
    });
  }

  async archiveChat(chatId: string, userId: string) {
    return this.request(`/chat/archive/${chatId}/${userId}`, {
      method: 'PUT',
    });
  }

  // Notification methods
  async getNotifications() {
    return this.request('/notification', {
      method: 'GET',
    });
  }

  async getUnreadNotificationCount() {
    return this.request('/notification/unread-count', {
      method: 'GET',
    });
  }

  async markNotificationAsRead(notificationId: string) {
    return this.request(`/notification/${notificationId}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead() {
    return this.request('/notification/mark-all-read', {
      method: 'PUT',
    });
  }

  async deleteNotification(notificationId: string) {
    return this.request(`/notification/${notificationId}`, {
      method: 'DELETE',
    });
  }

  // Message edit/delete methods
  async editMessage(messageId: string, content: string) {
    return this.request(`/chat/message/${messageId}/edit`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async deleteMessage(messageId: string) {
    return this.request(`/chat/message/${messageId}/delete`, {
      method: 'DELETE',
    });
  }

  async unarchiveChat(chatId: string, userId: string) {
    return this.request(`/chat/unarchive/${chatId}/${userId}`, {
      method: 'PUT',
    });
  }

  async blockUser(blockerId: string, blockedUserId: string) {
    return this.request(`/chat/block/${blockerId}/${blockedUserId}`, {
      method: 'POST',
    });
  }

  async unblockUser(blockerId: string, blockedUserId: string) {
    return this.request(`/chat/unblock/${blockerId}/${blockedUserId}`, {
      method: 'POST',
    });
  }

  // Admin chat endpoints
  async getAllChats() {
    return this.request('/chat/all');
  }

  // Monitor/Admin chat endpoint (dedicated for monitor dashboard)
  async getAllChatsForMonitor() {
    return this.request('/chat/monitor/all');
  }

  async getChatById(chatId: string) {
    return this.request(`/chat/${chatId}`, {
      method: 'GET',
    });
  }

  // Chat assignment endpoints
  async assignMonitorToChat(chatId: string, monitorId: string) {
    return this.request(`/chat/assign/${chatId}/${monitorId}`, {
      method: 'POST',
    });
  }

  async unassignMonitorFromChat(chatId: string, monitorId?: string) {
    const url = monitorId 
      ? `/chat/unassign/${chatId}?monitorId=${monitorId}`
      : `/chat/unassign/${chatId}`;
    return this.request(url, {
      method: 'DELETE',
    });
  }

  async getAssignedMonitor(chatId: string) {
    return this.request(`/chat/assigned/${chatId}`, {
      method: 'GET',
    });
  }

  // Health check endpoint
  async checkHealth() {
    return this.request('/health', {
      method: 'GET',
    });
  }
}

export const apiClient = new ApiClient(API_BASE_URL, API_BEARER_TOKEN);

// Initialize bearer token on app start
function initializeBearerToken() {
  // First, check if user is already logged in (has token in localStorage)
  const userToken = localStorage.getItem('auth_token');
  
  if (userToken) {
    // User is logged in - use their token
    apiClient.setToken(userToken);
    apiClient.setBearerToken(userToken);
    console.log('✅ API Client initialized with USER login token:', {
      hasToken: true,
      tokenLength: userToken.length,
      tokenPreview: userToken.substring(0, 50) + '...',
      source: 'user_login'
    });
  } else if (API_BEARER_TOKEN) {
    // No user logged in - use default bearer token
    apiClient.setBearerToken(API_BEARER_TOKEN);
    console.log('✅ API Client initialized with DEFAULT bearer token:', {
      hasToken: true,
      tokenLength: API_BEARER_TOKEN.length,
      tokenPreview: API_BEARER_TOKEN.substring(0, 50) + '...',
      source: 'default_token'
    });
  } else {
    console.error('❌ CRITICAL: No bearer token available! API calls will fail.');
  }
}

// Initialize immediately
initializeBearerToken();

// Also listen for storage changes (when user logs in/out)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === 'auth_token') {
      console.log('🔄 Auth token changed in storage, reinitializing...');
      initializeBearerToken();
    }
  });
}

export type { ApiResponse };
