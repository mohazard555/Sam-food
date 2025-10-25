import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// Interfaces for type safety
interface Recipe {
  id: string;
  name: string;
  category: string;
  image: string;
  ingredients: string[];
  steps: string;
}

interface Ad {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string;
}

interface AdminCredentials {
  username: string;
  password?: string; // Made optional for display purposes, but required for login
}


interface HomePageProps {
  recipes: Recipe[];
  ads: Ad[];
  onViewRecipe: (recipe: Recipe) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
  onDeleteAd: (id: string) => void;
  onEditAd: (ad: Ad) => void;
  onNavigate: (page: string) => void;
  isLoggedIn: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
  loadError: string | null;
}

const CATEGORIES = ["حلويات", "أطباق رئيسية", "مقبلات", "سلطات", "مشروبات"];

// Helper functions for LocalStorage
const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue: React.Dispatch<React.SetStateAction<T>> = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue];
};

// Utility to convert file to base64
const toBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

// Main App Component
const App = () => {
  // A default URL for the data file. The admin should host their exported JSON
  // and can override this by setting a new one in the admin panel.
  // This ensures that new visitors can fetch the latest content.
  const DEFAULT_UPDATE_URL = 'https://api.npoint.io/0e4c62c954054a3692cb';

  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes', []);
  const [ads, setAds] = useLocalStorage<Ad[]>('ads', []);
  const [logo, setLogo] = useLocalStorage<string | null>('siteLogo', null);
  const [adminCredentials, setAdminCredentials] = useLocalStorage<AdminCredentials>('adminCredentials', { username: 'admin', password: '12345' });
  const [updateKey, setUpdateKey] = useLocalStorage<string>('updateKey', 'DEFAULT_KEY');
  const [updateUrl, setUpdateUrl] = useLocalStorage<string>('updateUrl', DEFAULT_UPDATE_URL);
  const [lastUpdateKey, setLastUpdateKey] = useLocalStorage<string | null>('lastUpdateKey', null);
  const [aboutContent, setAboutContent] = useLocalStorage<string>(
    'aboutContent',
    `مرحبًا بك في SAM FOOD، منصتك المثالية لمشاركة وحفظ وصفات الطبخ المفضلة لديك بسهولة وأناقة.
هدفنا هو توفير مساحة إبداعية للطهاة من جميع المستويات، حيث يمكنهم تنظيم وصفاتهم، استكشاف أطباق جديدة، ومشاركة إبداعاتهم مع العالم.
كل شيء يتم تخزينه محليًا في متصفحك لضمان الخصوصية والسرعة.`
  );
  
  const [page, setPage] = useState('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [editingAd, setEditingAd] = useState<Ad | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(sessionStorage.getItem('isAdmin') === 'true');
  const [searchQuery, setSearchQuery] = useState('');
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [isSubscribed, setIsSubscribed] = useLocalStorage<boolean>('isSubscribed', false);
  const [subscriptionRequest, setSubscriptionRequest] = useState<Recipe | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const checkForUpdates = async () => {
        if (isLoggedIn) {
            setIsLoading(false);
            return;
        }
        if (!updateUrl) {
            setIsLoading(false);
            if (recipes.length === 0) {
                 setLoadError("لم يتم تكوين رابط التحديث. يرجى تسجيل الدخول كمدير وتعيين 'رابط ملف التحديث' في لوحة التحكم.");
            }
            return; 
        }

        setIsLoading(true);
        setLoadError(null);

        try {
            const url = new URL(updateUrl);
            url.searchParams.append('_t', new Date().getTime().toString());
            
            const response = await fetch(url.toString(), { cache: 'no-store' });
            
            if (!response.ok) {
                throw new Error(`فشل الاتصال بالخادم (رمز الحالة: ${response.status})`);
            }
            const data = await response.json();
            
            const needsUpdate = data && data.updateKey && (lastUpdateKey === null || data.updateKey !== lastUpdateKey);
            const isFirstLoadWithEmptyCache = recipes.length === 0 && data && Array.isArray(data.recipes);

            if (needsUpdate || isFirstLoadWithEmptyCache) {
                console.log('تطبيق تحديث جديد أو بيانات أولية...');
                
                if ('recipes' in data && Array.isArray(data.recipes)) {
                    setRecipes(data.recipes);
                    if (selectedRecipe && !data.recipes.some(r => r.id === selectedRecipe.id)) {
                        setSelectedRecipe(null);
                    }
                }
                if ('ads' in data && Array.isArray(data.ads)) {
                    setAds(data.ads);
                }
                if ('logo' in data) {
                    setLogo(data.logo);
                }
                if ('aboutContent' in data) {
                    setAboutContent(data.aboutContent);
                }
                
                if (data.updateKey) {
                    setLastUpdateKey(data.updateKey);
                }
                
                // This allows the data source URL to be updated remotely for all users.
                if (data.updateUrl && typeof data.updateUrl === 'string' && data.updateUrl !== updateUrl) {
                    console.log(`Switching update URL to: ${data.updateUrl}`);
                    setUpdateUrl(data.updateUrl);
                }
            }
        } catch (error) {
            console.error('Error during data fetch:', error);
            if (recipes.length === 0) { // Only show blocking error on first load fail
                setLoadError(`فشل في جلب الوصفات. قد يكون رابط التحديث غير صحيح أو هناك مشكلة في الشبكة. (${error.message})`);
            }
            console.warn('Failed to fetch updates, using cached data if available.');
        } finally {
            setIsLoading(false);
        }
    };

    checkForUpdates();
  }, [isLoggedIn]);


  const handleLogin = (success: boolean) => {
    if (success) {
      sessionStorage.setItem('isAdmin', 'true');
      setIsLoggedIn(true);
      navigate('home');
    }
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isAdmin');
    setIsLoggedIn(false);
    navigate('home');
  };

  const navigate = (page: string) => {
    window.scrollTo(0, 0);
    setPage(page);
    setEditingRecipe(null);
    setEditingAd(null);
  };
  
  const viewRecipe = (recipe: Recipe) => {
    if (isLoggedIn || isSubscribed) {
        setSelectedRecipe(recipe);
        navigate('recipeDetail');
    } else {
        setSubscriptionRequest(recipe);
    }
  };

  const handleSubscriptionConfirm = () => {
      if (subscriptionRequest) {
          setSelectedRecipe(subscriptionRequest);
          setIsSubscribed(true);
          navigate('recipeDetail');
          setSubscriptionRequest(null);
      }
  };

  const editRecipe = (recipe: Recipe) => {
    navigate('recipeForm');
    setEditingRecipe(recipe);
  }
  
  const editAd = (ad: Ad) => {
    navigate('adForm');
    setEditingAd(ad);
  }

  const handleRecipeSave = (recipe: Recipe) => {
    if (editingRecipe) {
      setRecipes(recipes.map(r => r.id === recipe.id ? recipe : r));
    } else {
      setRecipes([...recipes, recipe]);
    }
    navigate('home');
  };
  
  const handleAdSave = (ad: Ad) => {
    if (editingAd) {
      setAds(ads.map(a => a.id === ad.id ? ad : a));
    } else {
      setAds([...ads, ad]);
    }
    navigate('home');
  }

  const deleteRecipe = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الوصفة؟')) {
      setRecipes(recipes.filter(r => r.id !== id));
      if (selectedRecipe?.id === id) {
          navigate('home');
      }
    }
  };

  const deleteAd = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
        setAds(ads.filter(ad => ad.id !== id));
    }
  };
  
  const downloadRecipe = (recipe: Recipe) => {
      const content = `
# ${recipe.name}
**القسم:** ${recipe.category}

## المكونات
${recipe.ingredients.map(ing => `- ${ing}`).join('\n')}

## خطوات التحضير
${recipe.steps}
      `;
      const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${recipe.name.replace(/\s+/g, '_')}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };
  
  const handleImport = (data: any, options: { isPrivileged: boolean } = { isPrivileged: false }) => {
      const performImport = () => {
          let recipesWereUpdated = false;
          if (Array.isArray(data.recipes)) {
              setRecipes(data.recipes);
              recipesWereUpdated = true;
          }
          if (Array.isArray(data.ads)) {
              setAds(data.ads);
          }
          if (typeof data.logo !== 'undefined') {
              setLogo(data.logo);
          }
          if (typeof data.aboutContent !== 'undefined') {
              setAboutContent(data.aboutContent);
          }

          if (options.isPrivileged) {
              if (data.adminCredentials) setAdminCredentials(data.adminCredentials);
              if (data.updateKey) setUpdateKey(data.updateKey);
              if (data.updateUrl) setUpdateUrl(data.updateUrl);
          }
          
          if (recipesWereUpdated && selectedRecipe && !data.recipes.some(r => r.id === selectedRecipe.id)) {
              setSelectedRecipe(null);
          }

          alert('تم استيراد البيانات بنجاح!');
          if (options.isPrivileged) {
              navigate('home');
          }
      };
      
      if (window.confirm("هل أنت متأكد من استيراد البيانات؟ هذا سيؤدي إلى الكتابة فوق جميع البيانات الحالية.")) {
          performImport();
      }
  };

  const renderContent = () => {
     if (!isLoggedIn && page !== 'login' && page !== 'home' && page !== 'about' && page !== 'recipeDetail') {
        return <LoginPage onLogin={handleLogin} onGuest={() => navigate('home')} adminCredentials={adminCredentials} />;
     }
     
     const renderPage = () => {
        switch(page) {
          case 'recipeDetail':
            return selectedRecipe ? <RecipeDetail recipe={selectedRecipe} onEdit={editRecipe} onDelete={deleteRecipe} onDownload={downloadRecipe} isLoggedIn={isLoggedIn} /> : <p>لم يتم تحديد وصفة.</p>;
          case 'recipeForm':
            return isLoggedIn ? <RecipeForm onSave={handleRecipeSave} existingRecipe={editingRecipe} /> : <LoginPage onLogin={handleLogin} onGuest={() => navigate('home')} adminCredentials={adminCredentials} />;
          case 'adForm':
            return isLoggedIn ? <AdForm onSave={handleAdSave} existingAd={editingAd} /> : <LoginPage onLogin={handleLogin} onGuest={() => navigate('home')} adminCredentials={adminCredentials} />;
          case 'admin':
            return isLoggedIn ? <AdminPage 
                recipes={recipes} 
                ads={ads} 
                onImport={handleImport} 
                onLogoChange={setLogo} 
                currentLogo={logo}
                adminCredentials={adminCredentials}
                onCredentialsChange={setAdminCredentials}
                aboutContent={aboutContent}
                onAboutContentChange={setAboutContent}
                updateKey={updateKey}
                onUpdateKeyChange={setUpdateKey}
                updateUrl={updateUrl}
                onUpdateUrlChange={setUpdateUrl}
                 /> : <LoginPage onLogin={handleLogin} onGuest={() => navigate('home')} adminCredentials={adminCredentials} />;
          case 'about':
            return <AboutPage content={aboutContent}/>;
          case 'login':
             return isLoggedIn ? <HomePage recipes={recipes} ads={ads} onViewRecipe={viewRecipe} onEditRecipe={editRecipe} onDeleteRecipe={deleteRecipe} onDeleteAd={deleteAd} onEditAd={editAd} onNavigate={navigate} isLoggedIn={isLoggedIn} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isLoading={isLoading} loadError={loadError}/> : <LoginPage onLogin={handleLogin} onGuest={() => navigate('home')} adminCredentials={adminCredentials} />;
          case 'home':
          default:
            return <HomePage recipes={recipes} ads={ads} onViewRecipe={viewRecipe} onEditRecipe={editRecipe} onDeleteRecipe={deleteRecipe} onDeleteAd={deleteAd} onEditAd={editAd} onNavigate={navigate} isLoggedIn={isLoggedIn} searchQuery={searchQuery} setSearchQuery={setSearchQuery} isLoading={isLoading} loadError={loadError} />;
        }
      };

      return (
        <div className="text-gray-800">
          <Header onNavigate={navigate} isLoggedIn={isLoggedIn} onLogout={handleLogout} searchQuery={searchQuery} setSearchQuery={setSearchQuery} logo={logo} />
          <main className="container mx-auto p-4 md:p-8">
            {renderPage()}
          </main>
          <Footer onOpenUpdateModal={() => setIsUpdateModalOpen(true)} />
          <UpdateModal isOpen={isUpdateModalOpen} onClose={() => setIsUpdateModalOpen(false)} onImport={handleImport} />
          {subscriptionRequest && (
            <SubscriptionModal 
                onConfirm={handleSubscriptionConfirm}
                onClose={() => setSubscriptionRequest(null)}
            />
          )}
        </div>
      );
  }

  return renderContent();
};

const SubscriptionModal = ({ onConfirm, onClose }: { onConfirm: () => void, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-lg space-y-6 relative text-center">
            <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
            <h2 className="text-2xl font-bold text-gray-700">محتوى خاص بالمشتركين</h2>
            <p className="text-lg text-gray-600">
                لعرض هذه الوصفة، يرجى الاشتراك في قناتنا على يوتيوب أولاً لدعمنا وتقدير مجهودنا.
            </p>
            <div className="my-6">
                <a 
                    href="https://youtube.com/@jana_kids2020?si=lwYG1fnb8p151io2" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="btn btn-danger w-full py-3 text-lg inline-flex items-center justify-center gap-2"
                    style={{backgroundColor: '#FF0000'}}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10,15l6-3.5L10,8V15z M21.9,8.4c-0.3-1.1-1.2-2-2.3-2.3C18.1,5.8,12,5.8,12,5.8s-6.1,0-7.6,0.3C3.3,6.4,2.4,7.3,2.1,8.4 C1.8,9.9,1.8,12,1.8,12s0,2.1,0.3,3.6c0.3,1.1,1.2,2,2.3,2.3C6,18.2,12,18.2,12,18.2s6.1,0,7.6-0.3c1.1-0.3,2-1.2,2.3-2.3 C22.2,14.1,22.2,12,22.2,12S22.2,9.9,21.9,8.4z"></path>
                    </svg>
                    <span>الاشتراك في القناة</span>
                </a>
            </div>
            <p className="text-sm text-gray-500">بعد الاشتراك، يمكنك العودة والمتابعة.</p>
            <button onClick={onConfirm} className="btn btn-primary w-full py-3">لقد اشتركت، متابعة للوصفة</button>
        </div>
    </div>
);

const DefaultLogo = () => (
    <div className="flex items-center gap-2">
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M17.61 3.429C15.996 2.44 14.076 2 12 2C6.477 2 2 6.477 2 12C2 17.523 6.477 22 12 22C17.523 22 22 17.523 22 12C22 9.539 21.053 7.322 19.56 5.684" stroke="#8B5CF6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M19.16 2.83L17.61 3.429L19.78 5.6L19.16 2.83Z" fill="#8B5CF6"/>
        <path d="M11 7C11 4.79086 12.7909 3 15 3C17.2091 3 19 4.79086 19 7C19 8.29131 18.3975 9.43534 17.447 10.165C17.382 10.2117 17.3153 10.2563 17.2471 10.2988C15.6599 11.2959 15.3562 13.5684 16.0375 15.0002C16.8967 16.7842 16.0125 18.9967 14.2285 19.8559C12.4445 20.7151 10.2319 19.8309 9.37274 18.0469C8.51354 16.2629 9.39776 14.0504 11.1818 13.1912L11.4552 13.0487" stroke="#FB7185" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="text-2xl md:text-3xl font-bold text-purple-600">SAM <span className="text-gray-700">FOOD</span></span>
    </div>
);

const Logo = ({ logo }: { logo: string | null }) => (
    logo ? <img src={logo} alt="SAM FOOD Logo" className="h-10 max-w-xs" /> : <DefaultLogo />
);

const Header = ({ onNavigate, isLoggedIn, onLogout, searchQuery, setSearchQuery, logo }: { onNavigate: (page: string) => void, isLoggedIn: boolean, onLogout: () => void, searchQuery: string, setSearchQuery: (query: string) => void, logo: string | null }) => (
  <header className="bg-white/80 backdrop-blur-sm shadow-md sticky top-0 z-10 no-print">
    <nav className="container mx-auto px-4 md:px-8 py-4 flex justify-between items-center flex-wrap gap-4">
      <div onClick={() => onNavigate('home')} className="cursor-pointer">
        <Logo logo={logo} />
      </div>
       <div className="relative flex-grow max-w-lg order-3 sm:order-2 w-full sm:w-auto">
         <input type="search" placeholder="ابحث عن وصفة..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="form-input !pl-10 w-full" />
         <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute top-1/2 left-3 transform -translate-y-1/2 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
        </svg>
       </div>
      <div className="flex items-center gap-4 order-2 sm:order-3">
        <a onClick={() => onNavigate('home')} className="cursor-pointer hover:text-purple-600">الرئيسية</a>
        {isLoggedIn && (
           <a onClick={() => onNavigate('admin')} className="cursor-pointer hover:text-purple-600">لوحة التحكم</a>
        )}
        <a onClick={() => onNavigate('about')} className="cursor-pointer hover:text-purple-600">عن الموقع</a>
        {isLoggedIn ? (
          <>
            <button onClick={() => onNavigate('recipeForm')} className="btn btn-primary hidden md:block">
              + وصفة
            </button>
            <button onClick={onLogout} className="btn btn-secondary">خروج</button>
          </>
        ) : (
          <button onClick={() => onNavigate('login')} className="btn btn-primary">دخول</button>
        )}
      </div>
    </nav>
  </header>
);

const Footer = ({ onOpenUpdateModal }: { onOpenUpdateModal: () => void }) => (
    <footer className="bg-gray-800 text-white mt-12 p-6 text-center no-print">
      <div className="container mx-auto">
          <div className="mb-4">
              <a onClick={onOpenUpdateModal} className="cursor-pointer text-purple-300 hover:text-purple-200 hover:underline">
                  تحديث المحتوى يدوياً
              </a>
          </div>
          <p>&copy; {new Date().getFullYear()} SAM FOOD. كل الحقوق محفوظة.</p>
          <p className="text-sm text-gray-400 mt-2">
              تطوير: MOHANNAD AHMAD | TEL: +963998171954
          </p>
      </div>
    </footer>
);

const HomePage = ({ recipes, ads, onViewRecipe, onEditRecipe, onDeleteRecipe, onDeleteAd, onEditAd, onNavigate, isLoggedIn, searchQuery, isLoading, loadError }: HomePageProps) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
    
    const filteredRecipes = useMemo(() => {
        return recipes
            .filter(recipe => selectedCategory === 'الكل' || recipe.category === selectedCategory)
            .filter(recipe => 
                recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                recipe.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [recipes, selectedCategory, searchQuery]);

    if (isLoading) {
      return (
          <div className="text-center p-12 min-h-[calc(100vh-280px)] flex items-center justify-center">
              <p className="text-xl text-gray-600 animate-pulse">جاري تحميل الوصفات...</p>
          </div>
      );
    }

    if (loadError) {
        return (
            <div className="text-center p-8 my-8 bg-red-50 border border-red-200 rounded-lg max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-red-700">حدث خطأ</h3>
                <p className="text-red-600 mt-2">{loadError}</p>
            </div>
        );
    }

    return (
      <div className="min-h-[calc(100vh-280px)]">
        <section className="mb-12">
            <h2 className="text-3xl font-bold mb-6 text-center text-gray-700">أحدث الوصفات</h2>
            
            <div className="flex justify-center flex-wrap gap-2 mb-8">
                <button onClick={() => setSelectedCategory('الكل')} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${selectedCategory === 'الكل' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>الكل</button>
                {CATEGORIES.map(category => (
                    <button key={category} onClick={() => setSelectedCategory(category)} className={`px-4 py-2 rounded-full text-sm font-semibold transition ${selectedCategory === category ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                        {category}
                    </button>
                ))}
            </div>

            {filteredRecipes.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredRecipes.map(recipe => (
                        <RecipeCard 
                          key={recipe.id} 
                          recipe={recipe} 
                          onView={onViewRecipe} 
                          onEdit={onEditRecipe} 
                          onDelete={onDeleteRecipe} 
                          isLoggedIn={isLoggedIn}
                        />
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 mt-8">لا توجد وصفات حالياً. قد يقوم المدير بإضافتها قريباً.</p>
            )}
        </section>
        
        <section>
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold text-gray-700">قسم الإعلانات</h2>
                {isLoggedIn && (
                  <button onClick={() => onNavigate('adForm')} className="btn btn-secondary">
                      + إضافة إعلان
                  </button>
                )}
            </div>
            {ads.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {ads.map(ad => (
                        <AdCard key={ad.id} ad={ad} onDelete={onDeleteAd} onEdit={onEditAd} isLoggedIn={isLoggedIn} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500">لا توجد إعلانات حاليًا.</p>
            )}
        </section>
      </div>
    );
}

const RecipeCard: React.FC<{
  recipe: Recipe,
  onView: (recipe: Recipe) => void,
  onEdit: (recipe: Recipe) => void,
  onDelete: (id: string) => void,
  isLoggedIn: boolean
}> = ({ recipe, onView, onEdit, onDelete, isLoggedIn }) => (
    <div className="card flex flex-col justify-between">
      <div className="cursor-pointer" onClick={() => onView(recipe)}>
        <img src={recipe.image} alt={recipe.name} className="w-full h-48 object-cover" />
        <div className="p-4">
          <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full mb-2">{recipe.category}</span>
          <h3 className="text-lg font-bold hover:text-purple-600">{recipe.name}</h3>
        </div>
      </div>
      {isLoggedIn && (
        <div className="p-4 pt-2 flex justify-end gap-4 border-t mt-auto">
          <button onClick={(e) => { e.stopPropagation(); onEdit(recipe); }} className="text-sm font-medium text-blue-600 hover:underline">تعديل</button>
          <button onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }} className="text-sm font-medium text-red-600 hover:underline">حذف</button>
        </div>
      )}
    </div>
);


const AdCard: React.FC<{ ad: Ad, onDelete: (id: string) => void, onEdit: (ad: Ad) => void, isLoggedIn: boolean }> = ({ ad, onDelete, onEdit, isLoggedIn }) => (
    <div className="card p-4 flex flex-col items-center text-center">
        <img src={ad.image} alt={ad.title} className="w-full h-40 object-cover rounded-md mb-4" />
        <h3 className="text-xl font-bold">{ad.title}</h3>
        <p className="text-gray-600 my-2 flex-grow">{ad.description}</p>
        <a href={ad.link} target="_blank" rel="noopener noreferrer" className="btn btn-primary w-full mt-2">
            زيارة الإعلان
        </a>
        {isLoggedIn && (
          <div className="flex gap-2 mt-4">
              <button onClick={(e) => {e.stopPropagation(); onEdit(ad);}} className="text-sm text-blue-500 hover:underline">تعديل</button>
              <button onClick={(e) => {e.stopPropagation(); onDelete(ad.id);}} className="text-sm text-red-500 hover:underline">حذف</button>
          </div>
        )}
    </div>
);

// Fix: Define missing components to resolve "Cannot find name" errors.
const RecipeDetail = ({ recipe, onEdit, onDelete, onDownload, isLoggedIn }: { recipe: Recipe, onEdit: (recipe: Recipe) => void, onDelete: (id: string) => void, onDownload: (recipe: Recipe) => void, isLoggedIn: boolean }) => (
    <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 max-w-4xl mx-auto printable-area">
        <div className="flex justify-between items-start mb-6 no-print">
            {isLoggedIn && (
                <div className="flex gap-4">
                    <button onClick={() => onEdit(recipe)} className="btn btn-secondary">تعديل</button>
                    <button onClick={() => onDelete(recipe.id)} className="btn btn-danger">حذف</button>
                </div>
            )}
            <div className="flex gap-4">
                 <button onClick={() => onDownload(recipe)} className="btn btn-outline">تحميل</button>
                 <button onClick={() => window.print()} className="btn btn-primary">طباعة</button>
            </div>
        </div>
        
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">{recipe.name}</h1>
            <p className="text-lg text-purple-600 font-semibold">{recipe.category}</p>
        </div>

        <img src={recipe.image} alt={recipe.name} className="w-full h-64 md:h-96 object-cover rounded-lg mb-8" />
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <h2 className="text-2xl font-bold mb-4 border-b-2 border-purple-200 pb-2">المكونات</h2>
                <ul className="list-disc list-inside space-y-2 text-lg text-gray-700">
                    {recipe.ingredients.map((ingredient, index) => (
                        <li key={index}>{ingredient}</li>
                    ))}
                </ul>
            </div>
            <div className="md:col-span-2">
                <h2 className="text-2xl font-bold mb-4 border-b-2 border-purple-200 pb-2">خطوات التحضير</h2>
                <div className="prose max-w-none text-lg text-gray-700 whitespace-pre-wrap">{recipe.steps}</div>
            </div>
        </div>
    </div>
);

const LoginPage = ({ onLogin, onGuest, adminCredentials }: { onLogin: (success: boolean) => void, onGuest: () => void, adminCredentials: AdminCredentials }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (username === adminCredentials.username && password === adminCredentials.password) {
            setError('');
            onLogin(true);
        } else {
            setError('اسم المستخدم أو كلمة المرور غير صحيحة.');
        }
    };

    return (
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white shadow-md rounded-lg p-8 space-y-6">
                <h2 className="text-3xl font-bold text-center text-gray-800">تسجيل الدخول</h2>
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="form-label">اسم المستخدم</label>
                        <input id="username" type="text" value={username} onChange={e => setUsername(e.target.value)} className="form-input" required />
                    </div>
                    <div>
                        <label htmlFor="password" className="form-label">كلمة المرور</label>
                        <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" required />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                    <button type="submit" className="btn btn-primary w-full">دخول</button>
                </form>
                <div className="text-center">
                    <p className="text-gray-600">أو</p>
                    <button onClick={onGuest} className="text-purple-600 hover:underline font-medium">المتابعة كضيف</button>
                </div>
            </div>
        </div>
    );
};

const RecipeForm = ({ onSave, existingRecipe }: { onSave: (recipe: Recipe) => void, existingRecipe: Recipe | null }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [image, setImage] = useState('');
    const [ingredients, setIngredients] = useState('');
    const [steps, setSteps] = useState('');

    useEffect(() => {
        if (existingRecipe) {
            setName(existingRecipe.name);
            setCategory(existingRecipe.category);
            setImage(existingRecipe.image);
            setIngredients(existingRecipe.ingredients.join('\n'));
            setSteps(existingRecipe.steps);
        }
    }, [existingRecipe]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await toBase64(e.target.files[0]);
            setImage(base64);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const recipe: Recipe = {
            id: existingRecipe ? existingRecipe.id : new Date().toISOString(),
            name,
            category,
            image,
            ingredients: ingredients.split('\n').filter(ing => ing.trim() !== ''),
            steps,
        };
        onSave(recipe);
    };

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-bold mb-6 text-gray-700">{existingRecipe ? 'تعديل وصفة' : 'إضافة وصفة جديدة'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="name" className="form-label">اسم الوصفة</label>
                    <input id="name" type="text" value={name} onChange={e => setName(e.target.value)} className="form-input" required />
                </div>
                <div>
                    <label htmlFor="category" className="form-label">القسم</label>
                    <select id="category" value={category} onChange={e => setCategory(e.target.value)} className="form-input" required>
                        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="image" className="form-label">رابط الصورة أو قم برفع صورة</label>
                    <input id="image" type="text" value={image} onChange={e => setImage(e.target.value)} placeholder="https://example.com/image.jpg" className="form-input mb-2" />
                    <input type="file" onChange={handleImageUpload} className="form-input" />
                    {image && <img src={image} alt="معاينة" className="mt-4 rounded-lg w-48 h-48 object-cover"/>}
                </div>
                <div>
                    <label htmlFor="ingredients" className="form-label">المكونات (كل مكون في سطر)</label>
                    <textarea id="ingredients" value={ingredients} onChange={e => setIngredients(e.target.value)} rows={8} className="form-input" required></textarea>
                </div>
                <div>
                    <label htmlFor="steps" className="form-label">خطوات التحضير</label>
                    <textarea id="steps" value={steps} onChange={e => setSteps(e.target.value)} rows={12} className="form-input" required></textarea>
                </div>
                <button type="submit" className="btn btn-primary w-full">{existingRecipe ? 'حفظ التعديلات' : 'إضافة الوصفة'}</button>
            </form>
        </div>
    );
};

const AdForm = ({ onSave, existingAd }: { onSave: (ad: Ad) => void, existingAd: Ad | null }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [image, setImage] = useState('');

    useEffect(() => {
        if (existingAd) {
            setTitle(existingAd.title);
            setDescription(existingAd.description);
            setLink(existingAd.link);
            setImage(existingAd.image);
        }
    }, [existingAd]);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await toBase64(e.target.files[0]);
            setImage(base64);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const ad: Ad = {
            id: existingAd ? existingAd.id : new Date().toISOString(),
            title,
            description,
            link,
            image,
        };
        onSave(ad);
    };

    return (
        <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-3xl font-bold mb-6 text-gray-700">{existingAd ? 'تعديل إعلان' : 'إضافة إعلان جديد'}</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="title" className="form-label">عنوان الإعلان</label>
                    <input id="title" type="text" value={title} onChange={e => setTitle(e.target.value)} className="form-input" required />
                </div>
                <div>
                    <label htmlFor="description" className="form-label">الوصف</label>
                    <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={4} className="form-input" required></textarea>
                </div>
                <div>
                    <label htmlFor="link" className="form-label">رابط الإعلان</label>
                    <input id="link" type="url" value={link} onChange={e => setLink(e.target.value)} className="form-input" required />
                </div>
                 <div>
                    <label htmlFor="ad-image" className="form-label">رابط الصورة أو قم برفع صورة</label>
                    <input id="ad-image-url" type="text" value={image} onChange={e => setImage(e.target.value)} placeholder="https://example.com/image.jpg" className="form-input mb-2" />
                    <input type="file" id="ad-image-upload" onChange={handleImageUpload} className="form-input" />
                    {image && <img src={image} alt="معاينة" className="mt-4 rounded-lg w-48 h-48 object-cover"/>}
                </div>
                <button type="submit" className="btn btn-primary w-full">{existingAd ? 'حفظ التعديلات' : 'إضافة الإعلان'}</button>
            </form>
        </div>
    );
};

const AdminPage = ({
    recipes,
    ads,
    onImport,
    onLogoChange,
    currentLogo,
    adminCredentials,
    onCredentialsChange,
    aboutContent,
    onAboutContentChange,
    updateKey,
    onUpdateKeyChange,
    updateUrl,
    onUpdateUrlChange,
}: {
    recipes: Recipe[];
    ads: Ad[];
    onImport: (data: any, options: { isPrivileged: boolean }) => void;
    onLogoChange: (logo: string | null) => void;
    currentLogo: string | null;
    adminCredentials: AdminCredentials;
    onCredentialsChange: (creds: AdminCredentials) => void;
    aboutContent: string;
    onAboutContentChange: (content: string) => void;
    updateKey: string;
    onUpdateKeyChange: (key: string) => void;
    updateUrl: string;
    onUpdateUrlChange: (url: string) => void;
}) => {
    const [newUsername, setNewUsername] = useState(adminCredentials.username);
    const [newPassword, setNewPassword] = useState('');

    const handleExport = () => {
        const data = {
            recipes,
            ads,
            logo: currentLogo,
            aboutContent,
            adminCredentials: { username: adminCredentials.username, password: adminCredentials.password },
            updateKey,
            updateUrl,
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'sam_food_backup.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target?.result as string);
                    onImport(data, { isPrivileged: true });
                } catch (error) {
                    alert('ملف غير صالح.');
                }
            };
            reader.readAsText(file);
        }
    };
    
    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const base64 = await toBase64(e.target.files[0]);
            onLogoChange(base64);
        }
    };
    
    const handleCredentialsChange = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword) {
            alert("يرجى إدخال كلمة مرور جديدة.");
            return;
        }
        onCredentialsChange({ username: newUsername, password: newPassword });
        alert("تم تحديث بيانات الدخول بنجاح.");
        setNewPassword('');
    };
    
    const handleGenerateUpdateKey = () => {
        onUpdateKeyChange(new Date().toISOString());
    };

    return (
        <div className="max-w-5xl mx-auto space-y-12">
            <h1 className="text-4xl font-bold text-gray-800 text-center">لوحة التحكم</h1>

            <div className="card">
                <h2 className="card-header">إدارة البيانات</h2>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                    <div>
                        <p className="mb-2 text-gray-600">تصدير جميع البيانات (وصفات, إعلانات, إعدادات) كملف احتياطي.</p>
                        <button onClick={handleExport} className="btn btn-primary">تصدير البيانات</button>
                    </div>
                    <div>
                        <label htmlFor="import-file" className="form-label">استيراد بيانات من ملف</label>
                        <input id="import-file" type="file" onChange={handleImportFile} className="form-input" accept=".json" />
                    </div>
                </div>
            </div>

            <div className="card">
                <h2 className="card-header">إعدادات الموقع</h2>
                <div className="p-6 space-y-6">
                    <div>
                        <label className="form-label">شعار الموقع</label>
                        <div className="flex items-center gap-4">
                            {currentLogo ? <img src={currentLogo} alt="الشعار الحالي" className="h-16 w-auto bg-gray-100 p-1 rounded"/> : <p className="text-gray-500">لا يوجد شعار حالي</p>}
                             <input type="file" onChange={handleLogoUpload} className="form-input max-w-xs" accept="image/*" />
                             <button onClick={() => onLogoChange(null)} className="btn btn-secondary">إزالة الشعار</button>
                        </div>
                    </div>
                    <div>
                        <label htmlFor="about-content" className="form-label">محتوى صفحة "عن الموقع"</label>
                        <textarea id="about-content" value={aboutContent} onChange={e => onAboutContentChange(e.target.value)} rows={8} className="form-input"></textarea>
                    </div>
                </div>
            </div>
            
             <div className="card">
                <h2 className="card-header">إعدادات التحديث التلقائي</h2>
                <div className="p-6 space-y-6">
                    <div>
                        <label htmlFor="update-url" className="form-label">رابط ملف التحديث (JSON URL)</label>
                        <input id="update-url" type="url" value={updateUrl} onChange={e => onUpdateUrlChange(e.target.value)} className="form-input" placeholder="https://example.com/data.json" />
                        <p className="form-hint">هذا الرابط سيتم استخدامه لجلب التحديثات للزوار.</p>
                    </div>
                     <div>
                        <label htmlFor="update-key" className="form-label">مفتاح التحديث</label>
                        <div className="flex items-center gap-2">
                             <input id="update-key" type="text" value={updateKey} onChange={e => onUpdateKeyChange(e.target.value)} className="form-input" />
                             <button onClick={handleGenerateUpdateKey} className="btn btn-secondary flex-shrink-0">إنشاء مفتاح جديد</button>
                        </div>
                        <p className="form-hint">عندما يتغير هذا المفتاح في ملف JSON، سيقوم التطبيق بتحديث البيانات.</p>
                    </div>
                </div>
            </div>

            <div className="card">
                <h2 className="card-header">تغيير بيانات الدخول</h2>
                <form onSubmit={handleCredentialsChange} className="p-6 space-y-4">
                     <div>
                        <label htmlFor="username-change" className="form-label">اسم المستخدم</label>
                        <input id="username-change" type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="form-input" required />
                    </div>
                     <div>
                        <label htmlFor="password-change" className="form-label">كلمة المرور الجديدة</label>
                        <input id="password-change" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input" placeholder="اتركها فارغة لعدم التغيير" required/>
                    </div>
                    <button type="submit" className="btn btn-primary">تحديث البيانات</button>
                </form>
            </div>
        </div>
    );
};

const AboutPage = ({ content }: { content: string }) => (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md min-h-[calc(100vh-280px)]">
        <h1 className="text-4xl font-bold mb-6 text-gray-800 border-b-2 pb-4">عن الموقع</h1>
        <div className="prose max-w-none text-lg text-gray-700 whitespace-pre-wrap">
            {content}
        </div>
    </div>
);

const UpdateModal = ({ isOpen, onClose, onImport }: { isOpen: boolean, onClose: () => void, onImport: (data: any, options?: { isPrivileged: boolean }) => void }) => {
    const [jsonContent, setJsonContent] = useState('');

    if (!isOpen) return null;
    
    const handleImport = () => {
        try {
            const data = JSON.parse(jsonContent);
            onImport(data); // Don't use privileged import for manual updates
            onClose();
        } catch (error) {
            alert('JSON غير صالح. يرجى التحقق من المحتوى.');
        }
    };
    
    const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
         const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setJsonContent(content);
            };
            reader.readAsText(file);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-2xl space-y-6 relative">
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 hover:text-gray-800 text-2xl font-bold">&times;</button>
                <h2 className="text-2xl font-bold text-gray-700">تحديث المحتوى يدوياً</h2>
                <p className="text-gray-600">يمكنك استيراد البيانات من ملف JSON أو لصق محتوى JSON مباشرة.</p>
                <div>
                    <label htmlFor="import-file-modal" className="form-label">استيراد من ملف:</label>
                    <input id="import-file-modal" type="file" onChange={handleFileImport} className="form-input" accept=".json" />
                </div>
                <div>
                     <label htmlFor="json-content" className="form-label">أو الصق محتوى JSON هنا:</label>
                     <textarea
                        id="json-content"
                        rows={10}
                        value={jsonContent}
                        onChange={(e) => setJsonContent(e.target.value)}
                        className="form-input font-mono text-sm"
                        placeholder='{ "recipes": [...], "ads": [...] }'
                    ></textarea>
                </div>
                <div className="flex justify-end gap-4">
                    <button onClick={onClose} className="btn btn-secondary">إلغاء</button>
                    <button onClick={handleImport} className="btn btn-primary">استيراد البيانات</button>
                </div>
            </div>
        </div>
    );
};

const root = createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);