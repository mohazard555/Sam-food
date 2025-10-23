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
  onDeleteAd: (id: string) => void;
  onEditAd: (ad: Ad) => void;
  onNavigate: (page: string) => void;
  isLoggedIn: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
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
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('recipes', []);
  const [ads, setAds] = useLocalStorage<Ad[]>('ads', []);
  const [logo, setLogo] = useLocalStorage<string | null>('siteLogo', null);
  const [adminCredentials, setAdminCredentials] = useLocalStorage<AdminCredentials>('adminCredentials', { username: 'admin', password: '12345' });
  const [updateKey, setUpdateKey] = useLocalStorage<string>('updateKey', 'DEFAULT_KEY');
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
    setSelectedRecipe(null);
    setEditingRecipe(null);
    setEditingAd(null);
  };
  
  const viewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    navigate('recipeDetail');
  };

  const editRecipe = (recipe: Recipe) => {
    setEditingRecipe(recipe);
    navigate('recipeForm');
  }
  
  const editAd = (ad: Ad) => {
    setEditingAd(ad);
    navigate('adForm');
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
  
  const handleImport = (data: any) => {
      setRecipes(data.recipes || []);
      setAds(data.ads || []);
      if (data.logo) setLogo(data.logo);
      if (data.aboutContent) setAboutContent(data.aboutContent);
      if (data.adminCredentials) setAdminCredentials(data.adminCredentials);
      if (data.updateKey) setUpdateKey(data.updateKey);
      alert('تم استيراد البيانات بنجاح!');
      navigate('home');
  };

  const renderContent = () => {
     if (!isLoggedIn && page !== 'login' && page !== 'home' && page !== 'about' && page !== 'recipeDetail') {
        return <LoginPage onLogin={handleLogin} onGuest={() => navigate('home')} adminCredentials={adminCredentials} />;
     }
     
     const renderPage = () => {
        switch(page) {
          case 'recipeDetail':
            return <RecipeDetail recipe={selectedRecipe!} onEdit={editRecipe} onDelete={deleteRecipe} onDownload={downloadRecipe} isLoggedIn={isLoggedIn} />;
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
                 /> : <LoginPage onLogin={handleLogin} onGuest={() => navigate('home')} adminCredentials={adminCredentials} />;
          case 'about':
            return <AboutPage content={aboutContent}/>;
          case 'login':
             return isLoggedIn ? <HomePage recipes={recipes} ads={ads} onViewRecipe={viewRecipe} onDeleteAd={deleteAd} onEditAd={editAd} onNavigate={navigate} isLoggedIn={isLoggedIn} searchQuery={searchQuery} setSearchQuery={setSearchQuery} /> : <LoginPage onLogin={handleLogin} onGuest={() => navigate('home')} adminCredentials={adminCredentials} />;
          case 'home':
          default:
            return <HomePage recipes={recipes} ads={ads} onViewRecipe={viewRecipe} onDeleteAd={deleteAd} onEditAd={editAd} onNavigate={navigate} isLoggedIn={isLoggedIn} searchQuery={searchQuery} setSearchQuery={setSearchQuery} />;
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
        </div>
      );
  }

  return renderContent();
};

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
                  تحديث المحتوى
              </a>
          </div>
          <p>&copy; {new Date().getFullYear()} SAM FOOD. كل الحقوق محفوظة.</p>
          <p className="text-sm text-gray-400 mt-2">
              تطوير: MOHANNAD AHMAD | TEL: +963998171954
          </p>
      </div>
    </footer>
);

const HomePage = ({ recipes, ads, onViewRecipe, onDeleteAd, onEditAd, onNavigate, isLoggedIn, searchQuery, setSearchQuery }: HomePageProps) => {
    const [selectedCategory, setSelectedCategory] = useState<string>('الكل');
    
    const filteredRecipes = useMemo(() => {
        return recipes
            .filter(recipe => selectedCategory === 'الكل' || recipe.category === selectedCategory)
            .filter(recipe => 
                recipe.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                recipe.category.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [recipes, selectedCategory, searchQuery]);

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
                        <RecipeCard key={recipe.id} recipe={recipe} onView={onViewRecipe} />
                    ))}
                </div>
            ) : (
                <p className="text-center text-gray-500 mt-8">لا توجد وصفات تطابق بحثك. جرب البحث بكلمة أخرى أو غيّر القسم.</p>
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

// Fix: Changed component to be of type React.FC to correctly handle the 'key' prop.
const RecipeCard: React.FC<{ recipe: Recipe, onView: (recipe: Recipe) => void }> = ({ recipe, onView }) => (
    <div className="card cursor-pointer" onClick={() => onView(recipe)}>
        <img src={recipe.image} alt={recipe.name} className="w-full h-48 object-cover" />
        <div className="p-4">
            <span className="inline-block bg-purple-100 text-purple-700 text-xs font-semibold px-2 py-1 rounded-full mb-2">{recipe.category}</span>
            <h3 className="text-lg font-bold hover:text-purple-600">{recipe.name}</h3>
        </div>
    </div>
);

// Fix: Changed component to be of type React.FC to correctly handle the 'key' prop.
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

const RecipeDetail = ({ recipe, onEdit, onDelete, onDownload, isLoggedIn }: { recipe: Recipe, onEdit: (recipe: Recipe) => void, onDelete: (id: string) => void, onDownload: (recipe: Recipe) => void, isLoggedIn: boolean }) => (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg max-w-4xl mx-auto printable-area">
        <img src={recipe.image} alt={recipe.name} className="w-full h-64 md:h-96 object-cover rounded-lg mb-6"/>
        <h1 className="text-4xl font-bold mb-2">{recipe.name}</h1>
        <span className="inline-block bg-purple-100 text-purple-700 text-sm font-semibold px-3 py-1 rounded-full mb-6">{recipe.category}</span>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-1">
                <h2 className="text-2xl font-bold border-b-2 border-purple-400 pb-2 mb-4">المكونات</h2>
                <ul className="list-disc list-inside space-y-2 text-gray-700">
                    {recipe.ingredients.map((ing, index) => <li key={index}>{ing}</li>)}
                </ul>
            </div>
            <div className="md:col-span-2">
                <h2 className="text-2xl font-bold border-b-2 border-purple-400 pb-2 mb-4">خطوات التحضير</h2>
                <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">{recipe.steps}</p>
            </div>
        </div>

        <div className="mt-8 pt-6 border-t flex flex-wrap gap-4 justify-center no-print">
            <button onClick={() => onDownload(recipe)} className="btn btn-primary">تحميل الوصفة</button>
            <button onClick={() => window.print()} className="btn btn-secondary">طباعة</button>
            {isLoggedIn && (
              <>
                <button onClick={() => onEdit(recipe)} className="btn btn-secondary bg-blue-500 hover:bg-blue-600">تعديل</button>
                <button onClick={() => onDelete(recipe.id)} className="btn btn-danger">حذف</button>
              </>
            )}
        </div>
    </div>
);

const RecipeForm = ({ onSave, existingRecipe }: { onSave: (recipe: Recipe) => void, existingRecipe: Recipe | null }) => {
    const [name, setName] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [image, setImage] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [ingredients, setIngredients] = useState('');
    const [steps, setSteps] = useState('');

    useEffect(() => {
        if (existingRecipe) {
            setName(existingRecipe.name);
            setCategory(existingRecipe.category);
            setImage(existingRecipe.image);
            setImagePreview(existingRecipe.image);
            setIngredients(existingRecipe.ingredients.join('\n'));
            setSteps(existingRecipe.steps);
        }
    }, [existingRecipe]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64 = await toBase64(file);
            setImage(base64);
            setImagePreview(base64);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !category || !image || !ingredients || !steps) {
            alert('يرجى ملء جميع الحقول.');
            return;
        }
        onSave({
            id: existingRecipe ? existingRecipe.id : Date.now().toString(),
            name,
            category,
            image,
            ingredients: ingredients.split('\n').filter(ing => ing.trim() !== ''),
            steps,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-lg shadow-lg max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-center text-gray-700">{existingRecipe ? 'تعديل وصفة' : 'إضافة وصفة جديدة'}</h2>
            
            <div>
                <label className="block font-medium mb-1">اسم الوصفة</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} className="form-input" required />
            </div>

            <div>
                <label className="block font-medium mb-1">اختر القسم</label>
                <select value={category} onChange={e => setCategory(e.target.value)} className="form-select" required>
                    {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>

            <div>
                <label className="block font-medium mb-1">صورة الوصفة</label>
                <input type="file" onChange={handleImageChange} accept="image/*" className="form-input" />
                {imagePreview && <img src={imagePreview} alt="معاينة الصورة" className="mt-4 rounded-md w-full h-48 object-cover" />}
            </div>

            <div>
                <label className="block font-medium mb-1">المكونات (كل مكون في سطر)</label>
                <textarea value={ingredients} onChange={e => setIngredients(e.target.value)} rows={6} className="form-textarea" required></textarea>
            </div>

            <div>
                <label className="block font-medium mb-1">خطوات التحضير</label>
                <textarea value={steps} onChange={e => setSteps(e.target.value)} rows={8} className="form-textarea" required></textarea>
            </div>

            <button type="submit" className="btn btn-primary w-full py-3">{existingRecipe ? 'حفظ التعديلات' : 'حفظ الوصفة'}</button>
        </form>
    );
};

const AdForm = ({ onSave, existingAd }: { onSave: (ad: Ad) => void, existingAd: Ad | null }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [link, setLink] = useState('');
    const [image, setImage] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    
    useEffect(() => {
        if (existingAd) {
            setTitle(existingAd.title);
            setDescription(existingAd.description);
            setLink(existingAd.link);
            setImage(existingAd.image);
            setImagePreview(existingAd.image);
        }
    }, [existingAd]);

    const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const base64 = await toBase64(file);
            setImage(base64);
            setImagePreview(base64);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !link || !image) {
            alert('يرجى ملء حقول العنوان، الرابط، والصورة.');
            return;
        }
        onSave({
            id: existingAd ? existingAd.id : Date.now().toString(),
            title,
            description,
            link,
            image,
        });
    };

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-lg shadow-lg max-w-2xl mx-auto space-y-6">
            <h2 className="text-3xl font-bold text-center text-gray-700">{existingAd ? 'تعديل الإعلان' : 'إضافة إعلان جديد'}</h2>
            
            <div>
                <label className="block font-medium mb-1">عنوان الإعلان</label>
                <input type="text" value={title} onChange={e => setTitle(e.target.value)} className="form-input" required />
            </div>

            <div>
                <label className="block font-medium mb-1">وصف قصير</label>
                <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="form-input" />
            </div>
            
            <div>
                <label className="block font-medium mb-1">الرابط (URL)</label>
                <input type="url" value={link} onChange={e => setLink(e.target.value)} placeholder="https://example.com" className="form-input" required />
            </div>

            <div>
                <label className="block font-medium mb-1">صورة الإعلان</label>
                <input type="file" onChange={handleImageChange} accept="image/*" className="form-input" />
                {imagePreview && <img src={imagePreview} alt="معاينة الصورة" className="mt-4 rounded-md w-full h-48 object-cover" />}
            </div>

            <button type="submit" className="btn btn-primary w-full py-3">{existingAd ? 'حفظ التعديلات' : 'حفظ الإعلان'}</button>
        </form>
    );
};

const AboutPage = ({ content }: { content: string }) => (
    <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg max-w-3xl mx-auto text-center">
        <h2 className="text-3xl font-bold mb-4 text-gray-700">عن SAM FOOD</h2>
        <p className="text-lg text-gray-600 leading-relaxed whitespace-pre-wrap">
            {content}
        </p>
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
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
            <div className="w-full max-w-4xl mx-auto bg-white rounded-xl shadow-2xl overflow-hidden md:grid md:grid-cols-2">
                <div className="hidden md:block">
                    <img src="https://images.unsplash.com/photo-1504674900247-0877df9cc836?q=80&w=1200&auto=format&fit=crop" alt="Delicious food" className="object-cover w-full h-full" />
                </div>
                <div className="p-8 md:p-12 flex flex-col justify-center">
                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                        <div className="text-center mb-6">
                            <h2 className="text-3xl font-bold text-gray-800">أهلاً بك في SAM FOOD</h2>
                            <p className="text-gray-500 mt-2">سجل الدخول لإدارة المحتوى</p>
                        </div>
                        {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-md">{error}</p>}
                        <div>
                            <label className="block font-medium mb-1">اسم المستخدم</label>
                            <input type="text" value={username} onChange={e => setUsername(e.target.value)} className="form-input" required placeholder="admin" />
                        </div>
                         <div>
                            <label className="block font-medium mb-1">كلمة المرور</label>
                            <input type="password" value={password} onChange={e => setPassword(e.target.value)} className="form-input" required placeholder="•••••" />
                        </div>
                        <button type="submit" className="btn btn-primary w-full py-3 text-lg">دخول</button>
                        <div className="flex items-center justify-between">
                            <hr className="w-full border-gray-300" />
                            <span className="p-2 text-gray-400 text-sm">أو</span>
                            <hr className="w-full border-gray-300" />
                        </div>
                        <button type="button" onClick={onGuest} className="btn bg-gray-600 hover:bg-gray-700 w-full py-3 text-lg">تصفح كزائر</button>
                    </form>
                </div>
            </div>
        </div>
    );
};

interface AdminPageProps {
    recipes: Recipe[];
    ads: Ad[];
    onImport: (data: any) => void;
    onLogoChange: (logo: string | null) => void;
    currentLogo: string | null;
    adminCredentials: AdminCredentials;
    onCredentialsChange: (creds: AdminCredentials) => void;
    aboutContent: string;
    onAboutContentChange: (content: string) => void;
    updateKey: string;
    onUpdateKeyChange: (key: string) => void;
}

const AdminPage = ({ recipes, ads, onImport, onLogoChange, currentLogo, adminCredentials, onCredentialsChange, aboutContent, onAboutContentChange, updateKey, onUpdateKeyChange }: AdminPageProps) => {

    const [newUsername, setNewUsername] = useState(adminCredentials.username);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [editableAbout, setEditableAbout] = useState(aboutContent);
    const [editableUpdateKey, setEditableUpdateKey] = useState(updateKey);

    const handleCredentialsSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newUsername || !newPassword) {
            alert("اسم المستخدم وكلمة المرور الجديدة لا يمكن أن تكون فارغة.");
            return;
        }
        if (newPassword !== confirmPassword) {
            alert("كلمتا المرور غير متطابقتين.");
            return;
        }
        if (window.confirm("هل أنت متأكد من تغيير معلومات الدخول؟ ستحتاج لتسجيل الدخول مجدداً بالمعلومات الجديدة في المرة القادمة.")) {
            onCredentialsChange({ username: newUsername, password: newPassword });
            alert("تم تحديث معلومات الدخول بنجاح.");
            setNewPassword('');
            setConfirmPassword('');
        }
    };
    
    const handleAboutSave = () => {
        if (window.confirm("هل أنت متأكد من حفظ التغييرات على صفحة 'عن الموقع'؟")) {
            onAboutContentChange(editableAbout);
            alert("تم تحديث محتوى الصفحة بنجاح.");
        }
    };
    
    const handleUpdateKeySave = () => {
        if (!editableUpdateKey.trim()) {
            alert("مفتاح التحديث لا يمكن أن يكون فارغاً.");
            return;
        }
        if (window.confirm("هل أنت متأكد من حفظ مفتاح التحديث الجديد؟ ستحتاج لمشاركته مع الزوار ليتمكنوا من تحديث المحتوى.")) {
            onUpdateKeyChange(editableUpdateKey);
            alert("تم حفظ مفتاح التحديث بنجاح.");
        }
    };


    const handleExport = () => {
        const dataToExport = {
            recipes,
            ads,
            logo: currentLogo,
            adminCredentials,
            aboutContent,
            updateKey,
        };
        const jsonString = JSON.stringify(dataToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `sam_food_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File is not readable");
                const data = JSON.parse(text);

                if (window.confirm("هل أنت متأكد من استيراد البيانات؟ هذا سيؤدي إلى الكتابة فوق جميع البيانات الحالية.")) {
                    onImport(data);
                }
            } catch (error) {
                console.error("Failed to import data:", error);
                alert(`فشل استيراد البيانات: ${error.message}`);
            }
        };
        reader.readAsText(file);
        event.target.value = ''; // Reset file input
    };

    const handleLogoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            const base64 = await toBase64(file);
            onLogoChange(base64);
            alert("تم تغيير الشعار بنجاح.");
        } catch (error) {
            alert("فشل رفع الشعار.");
        }
    };
    
    const handleLogoReset = () => {
        if(window.confirm("هل أنت متأكد من إعادة الشعار للافتراضي؟")) {
            onLogoChange(null);
        }
    };

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <h1 className="text-4xl font-bold text-center text-gray-700">لوحة تحكم المدير</h1>
  
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3">إدارة بيانات الموقع</h2>
            <p className="text-gray-600">
              يمكنك تصدير جميع بيانات الموقع كملف احتياطي، أو استيراد ملف لاستعادة البيانات.
              <br/>
              <strong className="text-red-600">تحذير:</strong> الاستيراد سيقوم بالكتابة فوق جميع البيانات الحالية.
            </p>
            <div className="flex flex-wrap gap-4">
              <button onClick={handleExport} className="btn btn-primary">تصدير البيانات</button>
              <label className="btn btn-secondary cursor-pointer">
                <span>استيراد البيانات (للمدير)</span>
                <input type="file" className="hidden" accept=".json" onChange={handleImport} />
              </label>
            </div>
        </div>
  
        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3">إدارة الشعار</h2>
            <div className="md:flex md:items-center md:gap-8">
                <div className="mb-4 md:mb-0">
                  <p className="font-medium mb-2">الشعار الحالي:</p>
                  <div className="w-40 h-20 flex items-center justify-center bg-gray-100 p-2 rounded-md border">
                    {currentLogo ? <img src={currentLogo} alt="Site Logo" className="max-h-full max-w-full object-contain"/> : <DefaultLogo />}
                  </div>
                </div>
                <div className="flex-grow">
                  <p className="text-gray-600 mb-4">
                    اختر شعاراً جديداً للموقع. يفضل أن تكون الصورة بصيغة PNG أو SVG بخلفية شفافة.
                  </p>
                  <div className="flex flex-wrap gap-4">
                     <label className="btn btn-primary cursor-pointer">
                      <span>تغيير الشعار</span>
                      <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                    </label>
                    <button onClick={handleLogoReset} className="btn btn-danger">إعادة الشعار الافتراضي</button>
                  </div>
                </div>
            </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3">إدارة معلومات الدخول</h2>
            <form onSubmit={handleCredentialsSave} className="space-y-4">
                <div>
                    <label className="block font-medium mb-1">اسم المستخدم الجديد</label>
                    <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)} className="form-input" required />
                </div>
                <div>
                    <label className="block font-medium mb-1">كلمة المرور الجديدة</label>
                    <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} className="form-input" required placeholder="اتركها فارغة لعدم التغيير" />
                </div>
                <div>
                    <label className="block font-medium mb-1">تأكيد كلمة المرور الجديدة</label>
                    <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="form-input" required />
                </div>
                <button type="submit" className="btn btn-primary">حفظ معلومات الدخول</button>
            </form>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3">مفتاح تحديث الزوار</h2>
            <p className="text-gray-600">
                هذا هو المفتاح الذي سيستخدمه الزوار لتحديث محتوى الموقع لديهم. قم بتعيين مفتاح وشاركه معهم بالإضافة إلى ملف التصدير.
            </p>
            <div className="flex items-end gap-4">
                <div className="flex-grow">
                    <label className="block font-medium mb-1">مفتاح التحديث</label>
                    <input type="text" value={editableUpdateKey} onChange={e => setEditableUpdateKey(e.target.value)} className="form-input" required />
                </div>
                <button onClick={handleUpdateKeySave} className="btn btn-primary">حفظ المفتاح</button>
            </div>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-lg shadow-lg space-y-6">
            <h2 className="text-2xl font-bold text-gray-800 border-b pb-3">تعديل صفحة "عن الموقع"</h2>
            <div>
                <label className="block font-medium mb-1">محتوى الصفحة</label>
                <textarea value={editableAbout} onChange={e => setEditableAbout(e.target.value)} rows={8} className="form-textarea"></textarea>
            </div>
            <button onClick={handleAboutSave} className="btn btn-primary">حفظ محتوى الصفحة</button>
        </div>
      </div>
    );
};
  
const UpdateModal = ({ isOpen, onClose, onImport }: { isOpen: boolean, onClose: () => void, onImport: (data: any) => void }) => {
    if (!isOpen) return null;

    const [file, setFile] = useState<File | null>(null);
    const [key, setKey] = useState('');
    const [error, setError] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files[0]) {
            setFile(event.target.files[0]);
            setError('');
        }
    };

    const handleSubmit = () => {
        if (!file || !key.trim()) {
            setError('يرجى اختيار ملف وإدخال مفتاح التحديث.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("الملف غير قابل للقراءة");
                const data = JSON.parse(text);

                if (data.updateKey && data.updateKey === key) {
                    if (window.confirm("هل أنت متأكد من استيراد البيانات؟ هذا سيؤدي إلى الكتابة فوق جميع البيانات الحالية لديك.")) {
                        onImport(data);
                        onClose();
                    }
                } else {
                    setError('مفتاح التحديث غير صحيح أو أن الملف تالف.');
                }
            } catch (err) {
                setError(`فشل استيراد البيانات: ${err.message}`);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 md:p-8 w-full max-w-lg space-y-6 relative">
                <button onClick={onClose} className="absolute top-4 left-4 text-gray-500 hover:text-gray-800">&times;</button>
                <h2 className="text-2xl font-bold text-center text-gray-700">تحديث محتوى الموقع</h2>
                <p className="text-center text-gray-600">
                    لاستيراد آخر الوصفات، يرجى رفع ملف البيانات (`.json`) وإدخال مفتاح التحديث الذي حصلت عليه من مدير الموقع.
                </p>
                {error && <p className="text-red-500 text-center bg-red-100 p-3 rounded-md">{error}</p>}
                <div className="space-y-4">
                    <div>
                        <label className="block font-medium mb-1">ملف البيانات (.json)</label>
                        <input type="file" accept=".json" onChange={handleFileChange} className="form-input" />
                    </div>
                    <div>
                        <label className="block font-medium mb-1">مفتاح التحديث</label>
                        <input type="text" value={key} onChange={e => setKey(e.target.value)} className="form-input" placeholder="أدخل المفتاح هنا" />
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={handleSubmit} className="btn btn-primary w-full py-3">تحديث الآن</button>
                    <button onClick={onClose} className="btn bg-gray-600 hover:bg-gray-700 w-full py-3">إلغاء</button>
                </div>
            </div>
        </div>
    );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);