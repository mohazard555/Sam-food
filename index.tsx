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
      ingredients: ["خيار", "طماطم", "بصل أحمر", "زيتون كالاماتا", "جبنة فيتا