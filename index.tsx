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
  password?: string;
}

interface AppData {
  recipes: Recipe[];
  ads: Ad[];
  logo?: string;
  adminCredentials?: AdminCredentials;
}


interface HomePageProps {
  recipes: Recipe[];
  ads: Ad[];
  onViewRecipe: (recipe: Recipe) => void;
  onEditRecipe: (recipe: Recipe) => void;
  onDeleteRecipe: (id: string) => void;
  onDeleteAd: (id: string) => void;
  onEditAd: (ad: Ad) => void;
  isLoggedIn: boolean;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isLoading: boolean;
}

const CATEGORIES = ["حلويات", "أطباق رئيسية", "مقبلات", "سلطات", "مشروبات"];
const DATA_URL = 'https://corsproxy.io/?https://raw.githubusercontent.com/Samir-D-99/sam-food-data/main/data.json';

// --- UTILITY FUNCTIONS ---
const debounce = <F extends (...args: any[]) => any>(func: F, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>): void => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
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
  recipes, ads, onViewRecipe, onEditRecipe, onDeleteRecipe, onDeleteAd, onEditAd, isLoggedIn, searchQuery, setSearchQuery, isLoading
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

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
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

      {ads.length > 0 && searchQuery === '' && selectedCategory === 'الكل' && (
        <div className="mb-8">
          {ads.map(ad => (
            <AdCard key={ad.id} ad={ad} isLoggedIn={isLoggedIn} onEdit={() => onEditAd(ad)} onDelete={() => onDeleteAd(ad.id)} />
          ))}
        </div>
      )}

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

const SubscriptionModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-50">
        <div className="bg-white p-8 rounded-lg shadow-2xl text-center max-w-sm mx-auto">
            <h2 className="text-2xl font-bold text-purple-700 mb-4">لحظة من فضلك!</h2>
            <p className="text-gray-600 mb-6">للاطلاع على كافة تفاصيل الوصفة، يرجى الاشتراك في قناتنا أولاً. دعمكم يهمنا!</p>
            <a 
                href="https://www.youtube.com/@SAMFOOD" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn btn-danger w-full mb-3"
                onClick={onClose}
            >
                الاشتراك في القناة
            </a>
            <button onClick={onClose} className="text-gray-500 hover:underline">أنا مشترك بالفعل / إغلاق</button>
        </div>
    </div>
);

const RecipeDetailPage: React.FC<{ recipe: Recipe; onBack: () => void; }> = ({ recipe, onBack }) => {
  const printableRef = useRef<HTMLDivElement>(null);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  useEffect(() => {
    const isSubscribed = sessionStorage.getItem('isSubscribed');
    if (!isSubscribed) {
      setShowSubscriptionModal(true);
    }
  }, []);

  const handleCloseModal = () => {
    sessionStorage.setItem('isSubscribed', 'true');
    setShowSubscriptionModal(false);
  };

  const handlePrint = () => window.print();
  
  return (
    <div className="bg-white p-6 sm:p-8 rounded-lg shadow-xl max-w-4xl mx-auto">
      {showSubscriptionModal && <SubscriptionModal onClose={handleCloseModal} />}
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
    initialData ? (type === 'recipe' && Array.isArray((initialData as Recipe).ingredients) 
      ? {...initialData, ingredients: (initialData as Recipe).ingredients.join('\n')} 
      : initialData)
    : (type === 'recipe' 
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
      reader.onloadend = () => setFormData((prev: any) => ({ ...prev, image: reader.result as string }));
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
      <textarea name="ingredients" value={formData.ingredients} onChange={handleChange} placeholder="المكونات (كل مكون في سطر)" className="form-textarea h-32" required />
      <textarea name="steps" value={formData.steps} onChange={handleChange} placeholder="طريقة التحضير" className="form-textarea h-48" required />
    </>
  );

  const renderAdFields = () => (
    <>
      <input name="title" value={formData.title} onChange={handleChange} placeholder="عنوان الإعلان" className="form-input" required />
      <textarea name="description" value={formData.description} onChange={handleChange} placeholder="وصف الإعلان" className="form-textarea" required />
      <input name="link" value={formData.link} onChange={handleChange} placeholder="رابط الإعلان" className="form-input" required />
    </>
  );

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6 text-purple-700">{initialData ? 'تعديل' : 'إضافة'} {type === 'recipe' ? 'وصفة' : 'إعلان'}</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {type === 'recipe' ? renderRecipeFields() : renderAdFields()}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">صورة</label>
          <input type="file" accept="image/*" onChange={handleImageUpload} className="form-input" />
          {formData.image && <img src={formData.image} alt="معاينة" className="mt-4 rounded-lg max-h-48 w-auto" />}
        </div>
        <div className="flex gap-4 pt-4">
          <button type="submit" className="btn btn-primary flex-grow">حفظ</button>
          <button type="button" onClick={onCancel} className="btn btn-secondary flex-grow">إلغاء</button>
        </div>
      </form>
    </div>
  );
};

const AdminDashboard: React.FC<{
  onNavigate: (page: string, data?: any) => void;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onAdminChange: (creds: AdminCredentials) => void;
  adminCredentials: AdminCredentials;
}> = ({ onNavigate, onExport, onImport, onLogoChange, onAdminChange, adminCredentials }) => {
  const [newCreds, setNewCreds] = useState(adminCredentials);
  const importFileRef = useRef<HTMLInputElement>(null);
  const logoFileRef = useRef<HTMLInputElement>(null);

  const handleCredsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewCreds(prev => ({ ...prev, [name]: value }));
  };

  const handleCredsSave = (e: React.FormEvent) => {
    e.preventDefault();
    if(newCreds.password && newCreds.password.length < 4) {
      alert("كلمة المرور يجب أن تكون 4 أحرف على الأقل.");
      return;
    }
    onAdminChange(newCreds);
    alert("تم تحديث معلومات الدخول بنجاح.");
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-xl max-w-4xl mx-auto space-y-8">
      <h1 className="text-3xl font-bold text-purple-800 text-center">لوحة تحكم المدير</h1>

      {/* Content Management */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 text-pink-600">إدارة المحتوى</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={() => onNavigate('addRecipe')} className="btn btn-primary flex-grow">إضافة وصفة جديدة</button>
          <button onClick={() => onNavigate('addAd')} className="btn btn-primary flex-grow">إضافة إعلان جديد</button>
        </div>
      </div>

      {/* Data Management */}
      <div className="p-6 border rounded-lg">
        <h2 className="text-2xl font-semibold mb-4 text-pink-600">إدارة البيانات</h2>
        <div className="flex flex-col sm:flex-row gap-4">
          <button onClick={onExport} className="btn btn-secondary flex-grow">تصدير البيانات (JSON)</button>
          <input type="file" accept=".json" onChange={onImport} className="hidden" ref={importFileRef} />
          <button onClick={() => importFileRef.current?.click()} className="btn btn-secondary flex-grow">استيراد البيانات (JSON)</button>
        </div>
        <p className="text-sm text-gray-500 mt-2">تصدير جميع الوصفات والإعلانات والإعدادات في ملف واحد. الاستيراد سيقوم بالكتابة فوق البيانات الحالية.</p>
      </div>

      {/* Site Settings */}
      <div className="p-6 border rounded-lg space-y-6">
        <h2 className="text-2xl font-semibold text-pink-600">إعدادات الموقع</h2>
        <div>
          <h3 className="text-lg font-medium mb-2">تغيير الشعار</h3>
          <input type="file" accept="image/*" onChange={onLogoChange} className="hidden" ref={logoFileRef} />
          <button onClick={() => logoFileRef.current?.click()} className="btn btn-secondary">اختيار صورة شعار</button>
        </div>
        <div>
          <h3 className="text-lg font-medium mb-2">تغيير معلومات الدخول</h3>
          <form onSubmit={handleCredsSave} className="space-y-4">
            <input type="text" name="username" value={newCreds.username} onChange={handleCredsChange} placeholder="اسم المستخدم الجديد" className="form-input" required />
            <input type="password" name="password" onChange={handleCredsChange} placeholder="كلمة المرور الجديدة (اتركها فارغة لعدم التغيير)" className="form-input" />
            <button type="submit" className="btn btn-primary">حفظ معلومات الدخول</button>
          </form>
        </div>
      </div>
    </div>
  );
};


const LoginPage: React.FC<{ onLogin: (password: string) => void, username: string }> = ({ onLogin, username }) => {
  const [password, setPassword] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(password);
  };

  return (
    <div className="flex justify-center items-center h-screen">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-xl">
        <h2 className="text-2xl font-bold text-center text-purple-700 mb-6">تسجيل دخول المدير</h2>
        <p className="text-center text-gray-600 mb-4">أهلاً بك، {username}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="form-input text-center"
            required
          />
          <button type="submit" className="btn btn-primary w-full mt-4">دخول</button>
        </form>
      </div>
    </div>
  );
};


// --- MAIN APP COMPONENT ---

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState('home');
  const [selectedItem, setSelectedItem] = useState<Recipe | Ad | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  
  // Data state
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ads, setAds] = useState<Ad[]>([]);
  const [logo, setLogo] = useState<string>('');
  const [adminCredentials, setAdminCredentials] = useState<AdminCredentials>({ username: 'sam', password: '123' });
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginAttempt, setLoginAttempt] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(DATA_URL);
        if (!response.ok) throw new Error('Network response was not ok.');
        const data: AppData = await response.json();
        setRecipes(data.recipes || []);
        setAds(data.ads || []);
        setLogo(data.logo || '');
        if(data.adminCredentials?.username) setAdminCredentials(data.adminCredentials);
        localStorage.setItem('sam-food-data', JSON.stringify(data));
      } catch (error) {
        console.error("Failed to fetch master data, trying local storage.", error);
        const localData = localStorage.getItem('sam-food-data');
        if (localData) {
          const data: AppData = JSON.parse(localData);
          setRecipes(data.recipes || []);
          setAds(data.ads || []);
          setLogo(data.logo || '');
          if(data.adminCredentials?.username) setAdminCredentials(data.adminCredentials);
        }
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);
  
  const saveData = (data: AppData) => {
    setRecipes(data.recipes);
    setAds(data.ads);
    setLogo(data.logo || '');
    if(data.adminCredentials) setAdminCredentials(data.adminCredentials);
    localStorage.setItem('sam-food-data', JSON.stringify(data));
  };
  
  const handleNavigate = (page: string, data?: any) => {
    setCurrentPage(page);
    setSelectedItem(data || null);
  };
  
  const handleLogin = (password: string) => {
    if (password === adminCredentials.password) {
      setIsLoggedIn(true);
      setCurrentPage('admin');
    } else {
      alert('كلمة المرور غير صحيحة!');
    }
  };

  const handleSave = (item: Recipe | Ad) => {
    const isRecipe = 'category' in item;
    const currentList = isRecipe ? recipes : ads;
    const existingIndex = currentList.findIndex(i => i.id === item.id);

    let newList;
    if (existingIndex > -1) {
      newList = [...currentList];
      newList[existingIndex] = item as any;
    } else {
      newList = [item, ...currentList];
    }
    
    const newData: AppData = {
      recipes: isRecipe ? (newList as Recipe[]) : recipes,
      ads: !isRecipe ? (newList as Ad[]) : ads,
      logo,
      adminCredentials
    };
    saveData(newData);
    handleNavigate('home');
  };
  
  const handleDeleteRecipe = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذه الوصفة؟')) {
      const newRecipes = recipes.filter(r => r.id !== id);
      saveData({ recipes: newRecipes, ads, logo, adminCredentials });
    }
  };
  
  const handleDeleteAd = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الإعلان؟')) {
      const newAds = ads.filter(a => a.id !== id);
      saveData({ recipes, ads: newAds, logo, adminCredentials });
    }
  };
  
  const handleExportData = () => {
    const dataToExport: AppData = {
        recipes,
        ads,
        logo,
        adminCredentials: { username: adminCredentials.username, password: adminCredentials.password }
    };
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = 'sam_food_data.json';
    let linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!confirm("سيتم استبدال جميع البيانات الحالية. هل أنت متأكد؟")) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const importedData = JSON.parse(event.target?.result as string);
          saveData({
            recipes: importedData.recipes || [],
            ads: importedData.ads || [],
            logo: importedData.logo || '',
            adminCredentials: importedData.adminCredentials || { username: 'sam', password: '123' }
          });
          alert("تم استيراد البيانات بنجاح!");
          window.location.reload();
        } catch (error) {
          alert("فشل في قراءة الملف. تأكد من أنه ملف JSON صالح.");
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
        const newLogo = reader.result as string;
        setLogo(newLogo);
        saveData({ recipes, ads, logo: newLogo, adminCredentials });
        alert("تم تحديث الشعار بنجاح.");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAdminCredentialsChange = (creds: AdminCredentials) => {
    const newCreds = {
      username: creds.username,
      password: creds.password || adminCredentials.password
    }
    setAdminCredentials(newCreds);
    saveData({ recipes, ads, logo, adminCredentials: newCreds });
  };

  const renderContent = () => {
    if (loginAttempt) {
      return <LoginPage onLogin={handleLogin} username={adminCredentials.username} />;
    }
    switch(currentPage) {
      case 'recipeDetail':
        return <RecipeDetailPage recipe={selectedItem as Recipe} onBack={() => handleNavigate('home')} />;
      case 'addRecipe':
      case 'editRecipe':
        return <AdminForm type="recipe" onSave={handleSave} onCancel={() => handleNavigate('home')} initialData={selectedItem as Recipe} />;
      case 'addAd':
      case 'editAd':
        return <AdminForm type="ad" onSave={handleSave} onCancel={() => handleNavigate('home')} initialData={selectedItem as Ad} />;
      case 'admin':
        return <AdminDashboard 
            onNavigate={handleNavigate}
            onExport={handleExportData}
            onImport={handleImportData}
            onLogoChange={handleLogoChange}
            onAdminChange={handleAdminCredentialsChange}
            adminCredentials={adminCredentials}
         />;
      case 'home':
      default:
        return <HomePage 
          recipes={recipes} 
          ads={ads}
          onViewRecipe={(recipe) => handleNavigate('recipeDetail', recipe)}
          onEditRecipe={(recipe) => handleNavigate('editRecipe', recipe)}
          onDeleteRecipe={handleDeleteRecipe}
          onDeleteAd={handleDeleteAd}
          onEditAd={(ad) => handleNavigate('editAd', ad)}
          isLoggedIn={isLoggedIn}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          isLoading={isLoading}
        />;
    }
  };

  return (
    <>
      <header className="bg-white shadow-md p-4 sticky top-0 z-20 no-print">
        <div className="container mx-auto flex justify-between items-center">
          <div 
            className="text-2xl sm:text-3xl font-bold text-purple-700 cursor-pointer" 
            onClick={() => { handleNavigate('home'); setSearchQuery(''); }}
          >
            {logo ? <img src={logo} alt="Logo" className="max-h-12" /> : 'SAM FOOD'}
          </div>
          <div>
            {!isLoggedIn ? (
              <button onClick={() => setLoginAttempt(true)} className="btn btn-primary">دخول المدير</button>
            ) : (
              <div className="flex gap-2">
                <button onClick={() => handleNavigate('admin')} className="btn btn-primary">لوحة التحكم</button>
                <button onClick={() => setIsLoggedIn(false)} className="btn btn-secondary">تسجيل الخروج</button>
              </div>
            )}
          </div>
        </div>
      </header>
      <main className="container mx-auto p-4 sm:p-6">
        {renderContent()}
      </main>
    </>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);