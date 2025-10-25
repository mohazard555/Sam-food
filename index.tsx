import React, { useState, useEffect, useMemo, useRef } from 'react';
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
}

const CATEGORIES = ["حلويات", "أطباق رئيسية", "مقبلات", "سلطات", "مشروبات"];

// This URL is used for the *initial* data fetch for new users.
const DATA_URL = 'https://corsproxy.io/?https://raw.githubusercontent.com/Samir-D-99/sam-food-data/main/data.json';

// Embedded default data to act as a fallback if the initial fetch fails.
// This ensures new users always see content, even if the external service is down.
const DEFAULT_DATA = {
  recipes: [
    {
      id: "default-1",
      name: "كيكة الشوكولاتة الغنية",
      category: "حلويات",
      image: "https://images.pexels.com/photos/2067396/pexels-photo-2067396.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
      ingredients: ["2 كوب دقيق", "1 كوب سكر", "3/4 كوب كاكاو بودرة", "2 بيضة", "1 كوب حليب", "1/2 كوب زيت نباتي", "1 ملعقة صغيرة فانيليا"],
      steps: "1. سخن الفرن على 180 درجة مئوية.\n2. اخلط المكونات الجافة معًا.\n3. أضف المكونات السائلة واخلط حتى تتجانس.\n4. اسكب الخليط في قالب مدهون واخبزه لمدة 30-35 دقيقة."
    },
    {
      id: "default-2",
      name: "دجاج مشوي بالليمون والأعشاب",
      category: "أطباق رئيسية",
      image: "https://images.pexels.com/photos/5718025/pexels-photo-5718025.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
      ingredients: ["1 دجاجة كاملة", "2 ليمونة", "4 فصوص ثوم", "ملح وفلفل", "روزماري وزعتر طازج"],
      steps: "1. تبّل الدجاجة بالملح والفلفل والليمون والأعشاب.\n2. ضع الدجاجة في صينية فرن.\n3. اشويها في فرن مسخن مسبقًا على 200 درجة مئوية لمدة ساعة وربع أو حتى تنضج."
    },
     {
      id: "default-3",
      name: "سلطة يونانية منعشة",
      category: "سلطات",
      image: "https://images.pexels.com/photos/1211887/pexels-photo-1211887.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
      ingredients: ["خيار", "طماطم", "بصل أحمر", "زيتون كالاماتا", "جبنة فيتا", "زيت زيتون", "زعتر مجفف"],
      steps: "1. قطع الخضروات إلى قطع متوسطة الحجم.\n2. أضف الزيتون والجبنة.\n3. تبّل بزيت الزيتون والزعتر وقدمها فوراً."
    }
  ],
  ads: [
    {
      id: "default-ad-1",
      title: "أدوات مطبخ عصرية",
      description: "اكتشف مجموعتنا الجديدة من أدوات المطبخ التي تجعل الطهي أسهل وأكثر متعة. جودة عالية وأسعار لا تقاوم.",
      link: "#",
      image: "https://images.pexels.com/photos/3771110/pexels-photo-3771110.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1"
    }
  ]
};


// --- UTILITY FUNCTIONS ---

/**
 * A simple debounce function to limit how often a function can run.
 */
const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      func(...args);
    }, delay);
  };
};


// --- UI COMPONENTS ---

const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-t-4 border-b-4 border-purple-600"></div>
  </div>
);

const AdCard: React.FC<{ ad: Ad, onEdit: () => void, onDelete: () => void, isLoggedIn: boolean }> = ({ ad, onEdit, onDelete, isLoggedIn }) => (
  <div className="card my-4 flex flex-col sm:flex-row items-center">
    <img src={ad.image} alt={ad.title} className="w-full sm:w-48 h-48 object-cover"/>
    <div className="p-4 flex-grow">
      <h3 className="text-xl font-bold text-purple-700">{ad.title}</h3>
      <p className="text-gray-600 my-2">{ad.description}</p>
      <a href={ad.link} target="_blank" rel="noopener noreferrer" className="text-pink-500 hover:underline">اعرف المزيد...</a>
    </div>
    {isLoggedIn && (
      <div className="p-4 flex flex-col sm:flex-row gap-2 no-print">
        <button onClick={onEdit} className="btn btn-secondary w-full sm:w-auto">تعديل</button>
        <button onClick={onDelete} className="btn btn-danger w-full sm:w-auto">حذف</button>
      </div>
    )}
  </div>
);

const RecipeCard: React.FC<{ recipe: Recipe, onView: () => void, onEdit: () => void, onDelete: () => void, isLoggedIn: boolean }> = ({ recipe, onView, onEdit, onDelete, isLoggedIn }) => (
  <div className="card">
    <img src={recipe.image} alt={recipe.name} className="w-full h-48 object-cover" />
    <div className="p-4">
      <span className="text-sm bg-purple-100 text-purple-700 px-2 py-1 rounded-full">{recipe.category}</span>
      <h3 className="text-xl font-bold mt-2">{recipe.name}</h3>
    </div>
    <div className="p-4 border-t flex flex-wrap gap-2 items-center">
       <button onClick={onView} className="btn btn-primary flex-grow">عرض الوصفة</button>
       {isLoggedIn && (
        <>
          <button onClick={onEdit} className="btn btn-secondary flex-grow">تعديل</button>
          <button onClick={onDelete} className="btn btn-danger flex-grow">حذف</button>
        </>
       )}
    </div>
  </div>
);


// --- PAGE COMPONENTS ---

const HomePage: React.FC<HomePageProps> = ({
  recipes, ads, onViewRecipe, onEditRecipe, onDeleteRecipe, onDeleteAd, onEditAd, onNavigate, isLoggedIn, searchQuery, setSearchQuery, isLoading
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>("الكل");

  const debouncedSetSearchQuery = useMemo(() => debounce(setSearchQuery, 300), [setSearchQuery]);

  const filteredRecipes = useMemo(() => {
    return recipes.filter(recipe => {
      const matchesCategory = selectedCategory === "الكل" || recipe.category === selectedCategory;
      const matchesSearch = recipe.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [recipes, selectedCategory, searchQuery]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {/* Search and Filter Bar */}
      <div className="p-4 bg-white rounded-lg shadow-md mb-6 sticky top-4 z-10">
        <div className="flex flex-col sm:flex-row gap-4">
          <input
            type="text"
            placeholder="ابحث عن وصفة..."
            defaultValue={searchQuery}
            onChange={(e) => debouncedSetSearchQuery(e.target.value)}
            className="form-input flex-grow"
            aria-label="بحث عن وصفة"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="form-select"
            aria-label="اختر فئة"
          >
            <option value="الكل">كل الفئات</option>
            {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
          </select>
        </div>
      </div>

      {/* Ads Section */}
      {ads.length > 0 && searchQuery === '' && selectedCategory === 'الكل' && (
        <div className="mb-8">
          {ads.map(ad => (
            <AdCard key={ad.id} ad={ad} isLoggedIn={isLoggedIn} onEdit={() => onEditAd(ad)} onDelete={() => onDeleteAd(ad.id)} />
          ))}
        </div>
      )}

      {/* Recipes Grid */}
      {filteredRecipes.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredRecipes.map(recipe => (
            <RecipeCard 
              key={recipe.id} 
              recipe={recipe} 
              onView={() => onViewRecipe(recipe)} 
              onEdit={() => onEditRecipe(recipe)}
              onDelete={() => onDeleteRecipe(recipe.id)}
              isLoggedIn={isLoggedIn}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-gray-500 text-lg">لا توجد وصفات تطابق بحثك.</p>
        </div>
      )}
    </div>
  );
};


const RecipeDetailPage: React.FC<{ recipe: Recipe; onBack: () => void; }> = ({ recipe, onBack }) => {
  const printableRef = useRef<HTMLDivElement>(null);
  
  const handlePrint = () => {
    window.print();
  };
  
  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-4xl mx-auto">
      <div ref={printableRef} className="printable-area">
        <img src={recipe.image} alt={recipe.name} className="w-full h-64 object-cover rounded-t-lg mb-6" />
        <h1 className="text-4xl font-bold text-purple-800 mb-4">{recipe.name}</h1>
        <span className="text-md bg-purple-100 text-purple-700 px-3 py-1 rounded-full mb-6 inline-block">{recipe.category}</span>
        
        <div className="my-8">
          <h2 className="text-2xl font-semibold text-pink-600 border-b-2 border-pink-200 pb-2 mb-4">المكونات</h2>
          <ul className="list-disc list-inside space-y-2 text-lg text-gray-700">
            {recipe.ingredients.map((ing, index) => <li key={index}>{ing}</li>)}
          </ul>
        </div>
        
        <div className="my-8">
          <h2 className="text-2xl font-semibold text-pink-600 border-b-2 border-pink-200 pb-2 mb-4">طريقة التحضير</h2>
          <p className="text-lg text-gray-700 whitespace-pre-line leading-relaxed">{recipe.steps}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 mt-8 pt-6 border-t no-print">
        <button onClick={onBack} className="btn btn-secondary flex-grow sm:flex-grow-0">العودة إلى القائمة</button>
        <button onClick={handlePrint} className="btn btn-primary flex-grow sm:flex-grow-0">طباعة الوصفة</button>
      </div>
    </div>
  );
};

const AdminForm: React.FC<{ 
  onSave: (data: Recipe | Ad) => void, 
  onCancel: () => void, 
  initialData?: Recipe | Ad | null,
  type: 'recipe' | 'ad'
}> = ({ onSave, onCancel, initialData, type }) => {
  const [formData, setFormData] = useState<any>(
    initialData || (type === 'recipe' 
      ? { name: '', category: CATEGORIES[0], image: '', ingredients: '', steps: '' }
      : { title: '', description: '', link: '', image: '' })
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData((prev: any) => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = type === 'recipe' 
      ? { ...formData, ingredients: formData.ingredients.split('\n').filter((i: string) => i.trim() !== '') }
      : formData;
    onSave({ ...finalData, id: initialData?.id || `id_${new Date().getTime()}` });
  };

  const renderRecipeFields = () => (
    <>
      <input name="name" value={formData.name} onChange={handleChange} placeholder="اسم الوصفة" className="form-input" required />
      <select name="category" value={formData.category} onChange={handleChange} className="form-select" required>
        {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
      </select>
      <textarea name="ingredients" value={Array.isArray(formData.ingredients) ? formData.ingredients.join('\n') : formData.ingredients} onChange={handleChange} placeholder="المكونات (كل مكون في سطر)" className="form-textarea h-32" required />
      <textarea name="steps" value={formData.steps} onChange={handleChange} placeholder="خطوات التحضير" className="form-textarea h-48" required />
    </>
  );

  const renderAdFields = () => (
    <>
      <input name="title" value={formData.title} onChange={handleChange} placeholder="عنوان الإعلان" className="form-input" required />
      <textarea name="description" value={formData.description} onChange={handleChange} placeholder="وصف الإعلان" className="form-textarea h-24" required />
      <input name="link" value={formData.link} onChange={handleChange} placeholder="رابط الإعلان" className="form-input" required />
    </>
  );

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-center">{initialData ? 'تعديل' : 'إضافة'} {type === 'recipe' ? 'وصفة' : 'إعلان'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {type === 'recipe' ? renderRecipeFields() : renderAdFields()}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            صورة (رابط أو رفع ملف)
          </label>
          <input name="image" value={formData.image.startsWith('data:') ? '' : formData.image} onChange={handleChange} placeholder="أو الصق رابط الصورة هنا" className="form-input mb-2" />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="form-input" />
          {formData.image && <img src={formData.image} alt="معاينة" className="mt-4 rounded-md h-40 object-cover" />}
        </div>
        <div className="flex gap-4 pt-4">
          <button type="submit" className="btn btn-primary w-full">حفظ</button>
          <button type="button" onClick={onCancel} className="btn btn-secondary w-full">إلغاء</button>
        </div>
      </form>
    </div>
  );
};


const LoginPage: React.FC<{ onLogin: (creds: AdminCredentials) => void, error: string | null }> = ({ onLogin, error }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin({ username, password });
  };

  return (
    <div className="max-w-md mx-auto mt-20">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-xl space-y-6">
        <h2 className="text-2xl font-bold text-center text-purple-700">تسجيل دخول المدير</h2>
        {error && <p className="text-red-500 text-center bg-red-100 p-2 rounded-md">{error}</p>}
        <div>
          <label className="block font-medium text-gray-700">اسم المستخدم</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="form-input mt-1"
            required
          />
        </div>
        <div>
          <label className="block font-medium text-gray-700">كلمة المرور</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="form-input mt-1"
            required
          />
        </div>
        <button type="submit" className="btn btn-primary w-full">دخول</button>
      </form>
    </div>
  );
};

const AdminDashboard: React.FC<{
    onNavigate: (page: string) => void,
    onExport: () => void,
    onImport: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void,
    onCredsChange: (creds: AdminCredentials) => void,
    adminCreds: AdminCredentials
}> = ({ onNavigate, onExport, onImport, onLogoChange, onCredsChange, adminCreds }) => {
    
    const [newUsername, setNewUsername] = useState(adminCreds.username);
    const [newPassword, setNewPassword] = useState('');

    const handleCredsSave = () => {
        if (!newUsername) {
            alert('اسم المستخدم لا يمكن أن يكون فارغاً.');
            return;
        }
        onCredsChange({ username: newUsername, password: newPassword });
        alert('تم تحديث معلومات تسجيل الدخول بنجاح.');
        setNewPassword('');
    };

    return (
        <div className="bg-white p-8 rounded-lg shadow-xl max-w-4xl mx-auto space-y-8">
            <h1 className="text-3xl font-bold text-center text-purple-800">لوحة تحكم المدير</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <button onClick={() => onNavigate('addRecipe')} className="btn btn-primary p-6 text-xl">إضافة وصفة جديدة</button>
                <button onClick={() => onNavigate('addAd')} className="btn btn-secondary p-6 text-xl">إضافة إعلان جديد</button>
            </div>

            {/* Data Management */}
            <div className="p-6 border rounded-lg">
                <h2 className="text-xl font-semibold mb-4">إدارة البيانات</h2>
                <div className="flex flex-wrap gap-4">
                    <button onClick={onExport} className="btn btn-primary">تصدير البيانات (JSON)</button>
                    <label className="btn btn-secondary cursor-pointer">
                        استيراد البيانات (JSON)
                        <input type="file" accept=".json" onChange={onImport} className="hidden" />
                    </label>
                </div>
                 <p className="text-sm text-gray-500 mt-2">
                    يمكنك حفظ نسخة احتياطية من جميع الوصفات والإعلانات أو استعادتها.
                    <br />
                    <strong className="text-red-500">ملاحظة:</strong> الاستيراد سيحذف جميع البيانات الحالية.
                </p>
            </div>

            {/* Customization */}
            <div className="p-6 border rounded-lg">
                <h2 className="text-xl font-semibold mb-4">تخصيص</h2>
                 <label className="btn btn-secondary cursor-pointer">
                    تغيير شعار الموقع
                    <input type="file" accept="image/*" onChange={onLogoChange} className="hidden" />
                </label>
                <p className="text-sm text-gray-500 mt-2">اختر صورة لتكون الشعار في رأس الصفحة.</p>
            </div>

             {/* Credentials Management */}
            <div className="p-6 border rounded-lg space-y-4">
                <h2 className="text-xl font-semibold">تغيير معلومات تسجيل الدخول</h2>
                <div>
                    <label className="block font-medium">اسم المستخدم الجديد</label>
                    <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="form-input" />
                </div>
                <div>
                    <label className="block font-medium">كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)</label>
                    <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-input" placeholder="********" />
                </div>
                <button onClick={handleCredsSave} className="btn btn-primary">حفظ التغييرات</button>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

const App = () => {
  const [page, setPage] = useState('home'); // home, recipeDetail, addRecipe, editRecipe, addAd, editAd, login, admin
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingData, setEditingData] = useState<Recipe | Ad | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [logo, setLogo] = useState<string | null>(null);
  const [adminCreds, setAdminCreds] = useState<AdminCredentials>({ username: 'admin', password: 'password' });


  // --- Data Loading Effect ---
  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      
      const savedRecipes = localStorage.getItem('samfood_recipes');
      const savedAds = localStorage.getItem('samfood_ads');
      const savedLogo = localStorage.getItem('samfood_logo');
      const savedAdmin = localStorage.getItem('samfood_admin');

      // Priority 1: If data exists in localStorage, load it. No network request needed for returning users.
      if (savedRecipes && savedAds) {
        console.log("تم تحميل البيانات من التخزين المحلي.");
        setRecipes(JSON.parse(savedRecipes));
        setAds(JSON.parse(savedAds));
        if (savedLogo) setLogo(savedLogo);
        if (savedAdmin) setAdminCreds(JSON.parse(savedAdmin));
        setIsLoading(false);
        return; // Exit: Data loaded successfully from local storage.
      }

      // Priority 2: If no local data (new user), try fetching from the network.
      console.log("لا توجد بيانات محلية، محاولة الجلب من الشبكة...");
      try {
        // Add a cache-busting parameter to the URL
        const response = await fetch(`${DATA_URL}?_=${new Date().getTime()}`);
        if (!response.ok) {
          throw new Error(`فشل الاتصال بالخادم (رمز الحالة: ${response.status})`);
        }
        const data = await response.json();
        console.log("تم جلب البيانات بنجاح من الشبكة.");
        
        setRecipes(data.recipes);
        setAds(data.ads);
        // Save fetched data to localStorage for future visits
        localStorage.setItem('samfood_recipes', JSON.stringify(data.recipes));
        localStorage.setItem('samfood_ads', JSON.stringify(data.ads));

      } catch (error) {
        // Priority 3: If fetching fails, seamlessly use embedded default data.
        console.warn("فشل الجلب من الشبكة، سيتم استخدام البيانات الافتراضية:", error);
        
        setRecipes(DEFAULT_DATA.recipes);
        setAds(DEFAULT_DATA.ads);
        
        // Save default data to localStorage to prevent future fetch attempts on failure.
        localStorage.setItem('samfood_recipes', JSON.stringify(DEFAULT_DATA.recipes));
        localStorage.setItem('samfood_ads', JSON.stringify(DEFAULT_DATA.ads));
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialData();
  }, []);


  // --- Data Persistence Effects ---
  useEffect(() => {
    if(!isLoading) localStorage.setItem('samfood_recipes', JSON.stringify(recipes));
  }, [recipes, isLoading]);

  useEffect(() => {
    if(!isLoading) localStorage.setItem('samfood_ads', JSON.stringify(ads));
  }, [ads, isLoading]);
  
  useEffect(() => {
    if (logo) {
      localStorage.setItem('samfood_logo', logo);
    } else {
       localStorage.removeItem('samfood_logo');
    }
  }, [logo]);

  useEffect(() => {
     localStorage.setItem('samfood_admin', JSON.stringify(adminCreds));
  }, [adminCreds]);


  // --- Handlers ---
  const handleNavigate = (targetPage: string) => {
    setSearchQuery(''); // Reset search when navigating
    setPage(targetPage);
    window.scrollTo(0, 0);
  };

  const handleViewRecipe = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    handleNavigate('recipeDetail');
  };

  const handleSaveData = (data: Recipe | Ad) => {
    if ('category' in data) { // It's a Recipe
      setRecipes(prev => {
        const index = prev.findIndex(r => r.id === data.id);
        if (index > -1) {
          const newRecipes = [...prev];
          newRecipes[index] = data;
          return newRecipes;
        }
        return [data, ...prev];
      });
    } else { // It's an Ad
      setAds(prev => {
        const index = prev.findIndex(a => a.id === data.id);
        if (index > -1) {
          const newAds = [...prev];
          newAds[index] = data;
          return newAds;
        }
        return [data, ...prev];
      });
    }
    handleNavigate(isLoggedIn ? 'admin' : 'home');
    setEditingData(null);
  };
  
  const handleEditRecipe = (recipe: Recipe) => {
    setEditingData(recipe);
    handleNavigate('editRecipe');
  };

  const handleDeleteRecipe = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الوصفة؟')) {
      setRecipes(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleEditAd = (ad: Ad) => {
    setEditingData(ad);
    handleNavigate('editAd');
  };

  const handleDeleteAd = (id: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
      setAds(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleLogin = (creds: AdminCredentials) => {
    if (creds.username === adminCreds.username && creds.password === adminCreds.password) {
      setIsLoggedIn(true);
      setLoginError(null);
      handleNavigate('admin');
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    handleNavigate('home');
  };

  const handleExportData = () => {
    const dataToExport = JSON.stringify({ recipes, ads, logo, adminCreds: { username: adminCreds.username } }, null, 2);
    const blob = new Blob([dataToExport], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sam_food_backup.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!window.confirm('سيؤدي استيراد البيانات إلى حذف جميع الوصفات والإعلانات الحالية. هل تريد المتابعة؟')) {
      return;
    }
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          if (data.recipes && data.ads) {
            setRecipes(data.recipes);
            setAds(data.ads);
            if(data.logo) setLogo(data.logo);
            if(data.adminCreds && data.adminCreds.username) {
                setAdminCreds(prev => ({ ...prev, username: data.adminCreds.username }));
            }
            alert('تم استيراد البيانات بنجاح!');
          } else {
            alert('ملف غير صالح.');
          }
        } catch (error) {
          alert('حدث خطأ أثناء قراءة الملف.');
        }
      };
      reader.readAsText(file);
    }
  };
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setLogo(reader.result as string);
            alert('تم تحديث الشعار بنجاح!');
        };
        reader.readAsDataURL(file);
    }
  };
  
  const handleCredsChange = (creds: AdminCredentials) => {
      setAdminCreds(prev => ({
          ...prev,
          username: creds.username,
          password: creds.password || prev.password // Only update password if a new one is provided
      }));
  };

  const renderPage = () => {
    switch (page) {
      case 'recipeDetail':
        return selectedRecipe ? <RecipeDetailPage recipe={selectedRecipe} onBack={() => handleNavigate('home')} /> : <HomePage {...commonHomePageProps} />;
      case 'addRecipe':
        return <AdminForm type="recipe" onSave={handleSaveData} onCancel={() => handleNavigate('admin')} />;
      case 'editRecipe':
        return <AdminForm type="recipe" onSave={handleSaveData} onCancel={() => handleNavigate('home')} initialData={editingData as Recipe} />;
      case 'addAd':
        return <AdminForm type="ad" onSave={handleSaveData} onCancel={() => handleNavigate('admin')} />;
       case 'editAd':
        return <AdminForm type="ad" onSave={handleSaveData} onCancel={() => handleNavigate('home')} initialData={editingData as Ad} />;
      case 'login':
        return <LoginPage onLogin={handleLogin} error={loginError} />;
      case 'admin':
        return isLoggedIn ? <AdminDashboard 
            onNavigate={handleNavigate}
            onExport={handleExportData}
            onImport={handleImportData}
            onLogoChange={handleLogoChange}
            onCredsChange={handleCredsChange}
            adminCreds={adminCreds}
            /> : <LoginPage onLogin={handleLogin} error="الرجاء تسجيل الدخول للوصول." />;
      case 'home':
      default:
        return <HomePage {...commonHomePageProps} />;
    }
  };
  
  const commonHomePageProps = {
    recipes, ads, onViewRecipe: handleViewRecipe,
    onEditRecipe: handleEditRecipe, onDeleteRecipe: handleDeleteRecipe,
    onDeleteAd: handleDeleteAd, onEditAd: handleEditAd,
    onNavigate: handleNavigate, isLoggedIn,
    searchQuery, setSearchQuery,
    isLoading
  };

  return (
    <div className="container mx-auto p-4 sm:p-6">
      <header className="flex justify-between items-center mb-6 pb-4 border-b-2 border-purple-200">
        <h1 className="text-3xl sm:text-4xl font-bold text-purple-700 cursor-pointer" onClick={() => handleNavigate('home')}>
          {logo ? <img src={logo} alt="Sam Food Logo" className="h-16 w-auto" /> : 'SAM FOOD | سام فود'}
        </h1>
        <div className="no-print">
          {isLoggedIn ? (
            <div className="flex items-center gap-4">
               <button onClick={() => handleNavigate('admin')} className="btn btn-primary">لوحة التحكم</button>
               <button onClick={handleLogout} className="btn btn-secondary">تسجيل الخروج</button>
            </div>
          ) : (
            <button onClick={() => handleNavigate('login')} className="btn btn-primary">دخول المدير</button>
          )}
        </div>
      </header>
      <main>
        {renderPage()}
      </main>
      <footer className="text-center mt-10 pt-6 border-t text-gray-500">
        <p>&copy; {new Date().getFullYear()} SAM FOOD. جميع الحقوق محفوظة.</p>
      </footer>
    </div>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
