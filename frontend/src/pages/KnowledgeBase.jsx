import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import Modal from '../components/common/Modal';
import ConfirmModal from '@/components/common/ConfirmModal';
import CustomSelect from '@/components/ui/CustomSelect';
import Pagination from '../components/common/Pagination';
import { extractPageData } from '../utils/paginationHelper';
import { 
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell
} from '@/components/ui/table';
import {
  BookOpen,
  Search,
  PlusCircle,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  FolderCheck,
  Filter,
  Sparkles,
  Layers,
  List,
  LayoutGrid,
  Eye,
  FileText
} from 'lucide-react';

const KnowledgeBase = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [viewMode, setViewMode] = useState('list');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Expand State
  const [expandedArticle, setExpandedArticle] = useState(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState(null);

  // Modern UI Delete Modal State
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    id: null,
    title: '',
    categoryName: '',
    isDeleting: false
  });

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    categoryId: '',
    status: 'PUBLISHED',
  });

  // Search State
  const [searchQuery, setSearchQuery] = useState('');

  // Server-side Pagination States (0-indexed default, size 20 default)
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [totalElements, setTotalElements] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const tenantCode = user?.companyCode || 'DEFAULT';
  const kbKey = `ticketpro_kb_${tenantCode}`;

  const fetchArticlesAndCategories = async (page = currentPage, size = pageSize) => {
    try {
      const rawArticles = await api.get(`/kb?page=${page}&size=${size}`).catch(() => null);
      const pageData = extractPageData(rawArticles, page, size);
      setArticles(pageData.content);
      setTotalElements(pageData.totalElements);
      setTotalPages(pageData.totalPages);
      setCurrentPage(pageData.page);

      if (pageData.content.length > 0) {
        try { localStorage.setItem(kbKey, JSON.stringify(pageData.content)); } catch(_e) {}
      } else {
        const storedKb = localStorage.getItem(kbKey);
        if (storedKb) {
          try {
            const parsed = JSON.parse(storedKb);
            setArticles(Array.isArray(parsed) ? parsed : []);
          } catch(_e) {
            setArticles([]);
          }
        } else {
          setArticles([]);
        }
      }

      // Fetch Categories Live (Scoped by Tenant)
      let catList = [];
      const tenantCodeScoped = (user?.companyCode || 'DEFAULT').toUpperCase();
      const compId = user?.companyId;
      const compQuery = compId ? `companyId=${compId}` : `companyCode=${tenantCodeScoped}`;
      const apiCats = await api.get(`/categories/active?${compQuery}`).catch(() => null);
      if (apiCats && Array.isArray(apiCats) && apiCats.length > 0) {
        catList = apiCats;
      } else {
        const storedCats = localStorage.getItem(`ticketpro_categories_${tenantCodeScoped}`) || localStorage.getItem('ticketpro_categories');
        if (storedCats) {
          try {
            const parsed = JSON.parse(storedCats);
            if (Array.isArray(parsed) && parsed.length > 0) {
              catList = parsed.map((c, idx) => ({
                id: c.id || idx + 1,
                name: c.name || c.title || `Category ${idx + 1}`
              }));
            }
          } catch (_e) {}
        }
      }

      if (!catList) catList = [];
      setCategories(catList);
    } catch (err) {
      setError('Failed to fetch KB articles.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchArticlesAndCategories(currentPage, pageSize);
  }, [user, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery, selectedCategoryFilter]);

  const openCreateModal = () => {
    setSelectedArticle(null);
    setFormData({
      title: '',
      content: '',
      categoryId: categories[0]?.id || '',
      status: 'PUBLISHED',
    });
    setIsModalOpen(true);
  };

  const openEditModal = (e, art) => {
    e.stopPropagation();
    setSelectedArticle(art);
    setFormData({
      title: art.title,
      content: art.content,
      categoryId: art.category ? art.category.id : '',
      status: art.status,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const selectedCatObj = categories.find(c => c.id == formData.categoryId || c.name === formData.categoryId);
      const payload = {
        title: formData.title,
        content: formData.content,
        status: formData.status,
        categoryId: formData.categoryId ? parseInt(formData.categoryId) : null,
      };

      if (selectedArticle) {
        await api.put(`/kb/${selectedArticle.id}`, payload).catch(() => null);
        const updatedList = articles.map(art => art.id === selectedArticle.id ? {
          ...art,
          title: formData.title,
          content: formData.content,
          status: formData.status,
          category: selectedCatObj || { id: formData.categoryId, name: formData.categoryId || 'General' }
        } : art);
        setArticles(updatedList);
        try { localStorage.setItem(kbKey, JSON.stringify(updatedList)); } catch(_e) {}
      } else {
        const newArt = await api.post('/kb', payload).catch(() => null);
        const addedItem = newArt || {
          id: Date.now(),
          title: formData.title,
          content: formData.content,
          status: formData.status,
          category: selectedCatObj || { id: formData.categoryId, name: formData.categoryId || 'General' },
          createdAt: new Date().toISOString()
        };
        const updatedList = [addedItem, ...articles];
        setArticles(updatedList);
        try { localStorage.setItem(kbKey, JSON.stringify(updatedList)); } catch(_e) {}
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Operation failed.');
    }
  };

  const promptDelete = (e, art) => {
    e.stopPropagation();
    setDeleteModal({
      isOpen: true,
      id: art.id,
      title: art.title,
      categoryName: art.category?.name || 'General',
      isDeleting: false
    });
  };

  const handleConfirmDelete = async () => {
    const { id } = deleteModal;
    setDeleteModal(prev => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/kb/${id}`).catch(() => null);
      const updatedList = articles.filter(art => art.id !== id);
      setArticles(updatedList);
      try { localStorage.setItem(kbKey, JSON.stringify(updatedList)); } catch(_e) {}
    } catch (err) {
      setError('Failed to delete article.');
    } finally {
      setDeleteModal({ isOpen: false, id: null, title: '', categoryName: '', isDeleting: false });
    }
  };

  const toggleExpand = (id) => {
    if (expandedArticle === id) {
      setExpandedArticle(null);
    } else {
      setExpandedArticle(id);
    }
  };

  const filteredArticles = articles.filter((art) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = art.title?.toLowerCase().includes(query) || art.content?.toLowerCase().includes(query);
    const matchesCategory = selectedCategoryFilter === 'ALL' || (art.category && (art.category.name === selectedCategoryFilter || art.category.id == selectedCategoryFilter));
    return matchesSearch && matchesCategory;
  });

  const isStaff = user?.role === 'COMPANY_ADMIN' || user?.role === 'MANAGER' || user?.role === 'AGENT';

  return (
    <div className="space-y-6 text-left font-sans select-none pb-12">
      
      {/* HEADER BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center space-x-2.5">
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Knowledge Base & Guides</h1>
            <Badge variant="outline" className="bg-cyan-50 border-cyan-200/60 text-cyan-800 text-[10px] font-extrabold uppercase rounded-full px-2.5 py-0.5">
              Auto-Synced Categories
            </Badge>
          </div>
          <p className="text-xs font-medium text-slate-500 mt-1">Browse self-service guides and solutions synchronized live with Form Builder categories.</p>
        </div>
        {isStaff && (
          <Button
            onClick={openCreateModal}
            className="bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white font-bold shadow-md shadow-cyan-500/20 rounded-xl gap-2 cursor-pointer h-10 px-4 active:scale-95 shrink-0"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Create Article</span>
          </Button>
        )}
      </div>

      {error && (
        <div className="rounded-2xl bg-rose-50 p-4 text-xs font-bold text-rose-600 border border-rose-200">
          {error}
        </div>
      )}

      {/* SEARCH BAR & CATEGORY FILTER TABS */}
      <Card className="rounded-2xl border-slate-200/80 shadow-xs">
        <CardContent className="p-3.5 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search articles by title, keywords, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 rounded-xl border-slate-200 text-xs font-medium focus-visible:ring-indigo-600 bg-slate-50/50 h-10"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center space-x-1 border border-slate-200 p-1 rounded-2xl bg-slate-50 self-end sm:self-auto shrink-0">
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className={`rounded-xl text-xs font-bold gap-1.5 h-8 px-3 ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                <span>List View</span>
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('cards')}
                className={`rounded-xl text-xs font-bold gap-1.5 h-8 px-3 ${
                  viewMode === 'cards'
                    ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-200/60'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                <span>Card View</span>
              </Button>
            </div>
          </div>

          {/* LIVE CATEGORY FILTER PILLS */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1 mr-1 py-1">
              <Filter className="h-3 w-3" />
              <span>Categories:</span>
            </span>

            <Button
              type="button"
              variant={selectedCategoryFilter === 'ALL' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategoryFilter('ALL')}
              className={`rounded-xl text-xs font-bold transition-all h-8 px-3 cursor-pointer ${
                selectedCategoryFilter === 'ALL'
                  ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white shadow-xs border-transparent'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              All Articles
            </Button>

            {categories.map((cat) => {
              const isSelected = selectedCategoryFilter === cat.name || selectedCategoryFilter == cat.id;
              return (
                <Button
                  key={cat.id}
                  type="button"
                  variant={isSelected ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategoryFilter(cat.name)}
                  className={`rounded-xl text-xs font-bold transition-all h-8 px-3 cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white shadow-xs border-transparent'
                      : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  {cat.name}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ARTICLES CONTENT (LIST OR CARDS) */}
      {loading ? (
        <div className="flex h-48 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-500 border-t-transparent"></div>
        </div>
      ) : filteredArticles.length === 0 ? (
        <Card className="p-12 text-center rounded-3xl border-slate-200/80 space-y-2">
          <FolderCheck className="h-8 w-8 text-slate-300 mx-auto" />
          <p className="text-xs font-bold text-slate-500">No help articles found matching this filter or search query.</p>
        </Card>
      ) : viewMode === 'list' ? (
        /* LINE-BY-LINE LIST VIEW (RESPONSIVE) */
        <Card className="rounded-3xl border-slate-200/80 shadow-xs bg-white overflow-hidden">
          {/* Mobile Card List View (< md) */}
          <div className="block md:hidden divide-y divide-slate-100">
            {filteredArticles.map((art) => {
              const isExpanded = expandedArticle === art.id;
              return (
                <div key={art.id} className="p-4 space-y-2.5 hover:bg-cyan-50/20 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 shrink-0">
                        <BookOpen className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-xs font-bold text-slate-900 truncate block">
                          {art.title}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="rounded-md bg-slate-100 border-slate-200 text-slate-700 text-[9px] font-bold">
                            🏷️ {art.category ? art.category.name : 'General'}
                          </Badge>
                          {isStaff && (
                            <Badge variant="outline" className={`rounded-full text-[9px] font-bold ${
                              art.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {art.status}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleExpand(art.id)}
                        className="h-7 w-7 text-slate-400 hover:text-cyan-700 rounded-xl cursor-pointer"
                        title={isExpanded ? "Collapse" : "Read Article"}
                      >
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      </Button>
                      {isStaff && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => openEditModal(e, art)}
                            className="h-7 w-7 text-slate-400 hover:text-cyan-700 rounded-xl cursor-pointer"
                            title="Edit"
                          >
                            <Edit3 className="h-3 w-3" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={(e) => promptDelete(e, art)}
                            className="h-7 w-7 text-slate-400 hover:text-rose-600 rounded-xl cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>

                  {isExpanded ? (
                    <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 text-left text-xs font-semibold leading-relaxed text-slate-700 whitespace-pre-wrap">
                      {art.content}
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                      {art.content}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1 border-t border-slate-50">
                    <span>By: {art.createdBy?.name || 'Admin'}</span>
                    <span>{new Date(art.createdAt || Date.now()).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View (>= md) */}
          <div className="hidden md:block overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/80 border-b border-slate-200 text-[10px] font-black uppercase tracking-wider text-slate-400">
                  <TableHead className="py-3.5 px-5">Article & Summary</TableHead>
                  <TableHead className="py-3.5 px-4">Category</TableHead>
                  <TableHead className="py-3.5 px-4 text-center">Status</TableHead>
                  <TableHead className="py-3.5 px-4">Author & Date</TableHead>
                  <TableHead className="py-3.5 px-5 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-slate-100">
                {filteredArticles.map((art) => {
                  const isExpanded = expandedArticle === art.id;
                  return (
                    <React.Fragment key={art.id}>
                      <TableRow className="hover:bg-cyan-50/20 transition-colors group">
                        <TableCell className="py-3.5 px-5 max-w-sm">
                          <div className="flex items-start space-x-3">
                            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 shrink-0 mt-0.5">
                              <BookOpen className="h-4 w-4" />
                            </div>
                            <div className="min-w-0">
                              <span className="font-extrabold text-slate-900 block group-hover:text-cyan-700 transition-colors text-xs truncate">
                                {art.title}
                              </span>
                              <p className="text-[11px] text-slate-400 truncate mt-0.5">
                                {art.content}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <Badge variant="outline" className="rounded-md bg-slate-100 border-slate-200 text-slate-700 text-[10px] font-bold">
                            🏷️ {art.category ? art.category.name : 'General'}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 whitespace-nowrap text-center">
                          <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${
                            art.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {art.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="py-3.5 px-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <span className="text-xs font-bold text-slate-800">{art.createdBy?.name || 'Admin'}</span>
                            <span className="text-[10px] text-slate-400">{new Date(art.createdAt || Date.now()).toLocaleDateString()}</span>
                          </div>
                        </TableCell>

                        <TableCell className="py-3.5 px-5 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleExpand(art.id)}
                              className="rounded-xl text-xs font-bold border-slate-200 text-slate-700 bg-white hover:bg-cyan-50 hover:text-cyan-700 h-8 px-2.5 gap-1 cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              <span>{isExpanded ? 'Hide' : 'Read'}</span>
                            </Button>

                            {isStaff && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => openEditModal(e, art)}
                                  className="h-8 w-8 text-slate-400 hover:text-cyan-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                                  title="Edit"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => promptDelete(e, art)}
                                  className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 cursor-pointer"
                                  title="Delete"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>

                      {isExpanded && (
                        <TableRow className="bg-slate-50/60">
                          <TableCell colSpan={5} className="py-4 px-6">
                            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs font-semibold leading-relaxed text-slate-700 whitespace-pre-wrap">
                              {art.content}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : (
        /* EXPANDABLE CARD VIEW */
        <div className="space-y-3">
          {filteredArticles.map((art) => {
            const isExpanded = expandedArticle === art.id;
            return (
              <Card
                key={art.id}
                className="rounded-2xl border-slate-200/80 shadow-xs hover:shadow-md hover:border-cyan-500/30 transition-all cursor-pointer overflow-hidden"
                onClick={() => toggleExpand(art.id)}
              >
                <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-700 shrink-0">
                      <BookOpen className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-extrabold text-slate-900 leading-snug break-words">{art.title}</h3>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline" className="rounded-md bg-slate-100 border-slate-200 text-slate-700 text-[10px] font-bold">
                          🏷️ {art.category ? art.category.name : 'General'}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end space-x-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    {isStaff && (
                      <Badge variant="outline" className={`rounded-full text-[10px] font-bold ${
                        art.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {art.status}
                      </Badge>
                    )}

                    {/* Action buttons for staff */}
                    {isStaff && (
                      <div className="flex items-center space-x-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => openEditModal(e, art)}
                          className="h-8 w-8 text-slate-400 hover:text-cyan-700 rounded-xl hover:bg-slate-100 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={(e) => promptDelete(e, art)}
                          className="h-8 w-8 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}

                    {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-5 pb-5 pt-3 border-t border-slate-100 bg-slate-50/50 text-left">
                    <p className="text-xs font-semibold leading-relaxed text-slate-700 whitespace-pre-wrap">{art.content}</p>
                    <div className="pt-3 border-t border-slate-200/60 mt-3 flex items-center justify-between text-[10px] font-bold text-slate-400">
                      <span>Published by: {art.createdBy?.name || 'Admin'}</span>
                      <span>{new Date(art.createdAt || Date.now()).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* SERVER-SIDE PAGINATION CONTROLS */}
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalElements={totalElements || articles.length}
        pageSize={pageSize}
        onPageChange={(p) => {
          setCurrentPage(p);
          fetchArticlesAndCategories(p, pageSize);
        }}
        onPageSizeChange={(s) => {
          setPageSize(s);
          setCurrentPage(0);
          fetchArticlesAndCategories(0, s);
        }}
      />

      {/* ARTICLE CREATE / EDIT MODAL */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedArticle ? 'Edit Help Article' : 'Write Help Article'}
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div className="space-y-1.5">
            <Label htmlFor="kb-title">Article Title *</Label>
            <Input
              id="kb-title"
              type="text"
              required
              autoComplete="off"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g. Troubleshooting Guide"
              className="rounded-2xl border-slate-200 text-xs font-bold text-slate-900 focus-visible:ring-indigo-600 h-10"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kb-cat">Category (Live Synced with Form Builder)</Label>
            <CustomSelect
              id="kb-cat"
              value={formData.categoryId}
              onChange={(val) => setFormData({ ...formData, categoryId: val })}
              options={categories.map((c) => ({ value: c.name, label: c.name }))}
              placeholder="Select Category..."
              buttonClassName="w-full p-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 bg-white h-10 shadow-none"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kb-content">Article Content *</Label>
            <textarea
              id="kb-content"
              required
              rows="6"
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write the guide content step by step here..."
              className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium text-slate-900 focus:border-cyan-500 focus:outline-none"
            ></textarea>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="kb-status">Article State</Label>
            <CustomSelect
              id="kb-status"
              value={formData.status}
              onChange={(val) => setFormData({ ...formData, status: val })}
              options={[
                { value: 'DRAFT', label: 'DRAFT (HIDDEN FROM USERS)' },
                { value: 'PUBLISHED', label: 'PUBLISHED (PUBLIC)' }
              ]}
              buttonClassName="w-full p-2.5 rounded-2xl border border-slate-200 text-xs font-bold text-slate-900 bg-white h-10 shadow-none"
            />
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-to-r from-[#06b6d4] via-[#2563eb] to-[#4f46e5] hover:from-[#0891b2] hover:via-[#1d4ed8] hover:to-[#4338ca] text-white text-xs font-black shadow-md shadow-cyan-500/20 rounded-xl cursor-pointer active:scale-95"
            >
              Publish Article
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODERN UI DELETE CONFIRMATION MODAL */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, title: '', categoryName: '', isDeleting: false })}
        onConfirm={handleConfirmDelete}
        title="Delete Knowledge Base Article"
        message="Are you sure you want to permanently delete this guide? Users will no longer have self-service access to it."
        itemName={deleteModal.title}
        itemSubtext={deleteModal.categoryName ? `Category: ${deleteModal.categoryName}` : undefined}
        confirmText="Yes, Delete Article"
        cancelText="Keep Article"
        isLoading={deleteModal.isDeleting}
        type="danger"
      />

    </div>
  );
};

export default KnowledgeBase;
