import React, { useState, useEffect } from 'react';
import { Star, Search, RefreshCw, TrendingUp, TrendingDown, X, ChevronRight, Newspaper, Info, Globe, Layers, AlertCircle, CheckCircle2, ExternalLink, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Stock, MacroData } from './types';

export default function App() {
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [news, setNews] = useState<{title: string, link: string}[]>([]);
  const [watchlist, setWatchlist] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Stock[]>([]);
  const [showSearchPopup, setShowSearchPopup] = useState(false);
  const [activeTab, setActiveTab] = useState<'WATCHLIST' | 'KOSPI' | 'KOSDAQ' | 'MACRO' | 'THEME' | 'UPGRADED'>('KOSPI');
  const [macroData, setMacroData] = useState<MacroData | null>(null);
  const [indices, setIndices] = useState<any[]>([]);
  const [selectedTheme, setSelectedTheme] = useState<string>('');
  const [themeSearchQuery, setThemeSearchQuery] = useState('');
  const [visitors, setVisitors] = useState({ today: 0, total: 0 });

  useEffect(() => {
    // Record visit
    const recordVisit = async () => {
      try {
        const lastVisit = localStorage.getItem('lastVisitDate');
        const today = new Date().toDateString();

        if (lastVisit !== today) {
          const res = await fetch('/api/visit', { method: 'POST' });
          const data = await res.json();
          setVisitors(data);
          localStorage.setItem('lastVisitDate', today);
        } else {
          const res = await fetch('/api/visitors');
          const data = await res.json();
          setVisitors(data);
        }
      } catch (error) {
        console.error('Failed to record visit:', error);
      }
    };
    recordVisit();

    const fetchInitialIndices = async () => {
      try {
        const res = await fetch('/api/indices');
        if (res.ok) {
          const data = await res.json();
          setIndices(data);
        }
      } catch (e) {
        console.error('Failed to fetch indices', e);
      }
    };
    fetchInitialIndices();

    // Load watchlist from local storage
    const saved = localStorage.getItem('quant-watchlist');
    if (saved) {
      try {
        setWatchlist(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to parse watchlist', e);
      }
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const timestamp = Date.now();
      const [stocksRes, newsRes, macroRes, indicesRes] = await Promise.all([
        fetch(`/api/stocks?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/news?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/macro?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/indices?t=${timestamp}`, { cache: 'no-store' })
      ]);
      const stocksData = await stocksRes.json();
      const newsData = await newsRes.json();
      const macroData = await macroRes.json();
      const indicesData = await indicesRes.json();
      setStocks(stocksData);
      setNews(newsData);
      setMacroData(macroData);
      setIndices(indicesData);
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setLoading(true);
    try {
      const timestamp = Date.now();
      const [stocksRes, newsRes, macroRes, indicesRes] = await Promise.all([
        fetch(`/api/refresh?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/news?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/macro?t=${timestamp}`, { cache: 'no-store' }),
        fetch(`/api/indices?t=${timestamp}`, { cache: 'no-store' })
      ]);
      const stocksData = await stocksRes.json();
      const newsData = await newsRes.json();
      const macroData = await macroRes.json();
      const indicesData = await indicesRes.json();
      setStocks(stocksData);
      setNews(newsData);
      setMacroData(macroData);
      setIndices(indicesData);
    } catch (error) {
      console.error('Failed to refresh data', error);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 500); // Minimum animation time
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data);
      setShowSearchPopup(true);
    } catch (error) {
      console.error('Search failed', error);
    }
  };

  const toggleWatchlist = (code: string) => {
    setWatchlist(prev => {
      const newWatchlist = prev.includes(code) 
        ? prev.filter(c => c !== code)
        : [...prev, code];
      
      localStorage.setItem('quant-watchlist', JSON.stringify(newWatchlist));
      return newWatchlist;
    });
  };

  const kospiStocks = stocks.filter(s => s.market === 'KOSPI');
  const kosdaqStocks = stocks.filter(s => s.market === 'KOSDAQ');
  const watchlistedStocks = stocks.filter(s => watchlist.includes(s.code));

  const renderTable = (data: Stock[]) => (
    <div className="hidden md:block overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
          <tr>
            <th className="px-4 py-3 text-center w-12">저장</th>
            <th className="px-4 py-3 text-center w-16">순위</th>
            <th className="px-4 py-3">종목명</th>
            <th className="px-4 py-3 text-center">총점</th>
            <th className="px-4 py-3">목표가(괴리율)</th>
            <th className="px-4 py-3 text-center">가치 점수</th>
            <th className="px-4 py-3 min-w-[280px]">가치 지표</th>
            <th className="px-4 py-3">기술적 타점</th>
            <th className="px-4 py-3">실시간 뉴스</th>
          </tr>
        </thead>
        <tbody>
          {data.map((stock, idx) => (
            <StockTableRow 
              key={stock.id} 
              stock={stock} 
              rank={idx + 1} 
              isSaved={watchlist.includes(stock.code)}
              onToggleSave={() => toggleWatchlist(stock.code)}
            />
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCards = (data: Stock[]) => (
    <div className="md:hidden flex flex-col gap-4 p-4">
      {data.map((stock, idx) => (
        <StockCard 
          key={stock.id} 
          stock={stock} 
          rank={idx + 1}
          isSaved={watchlist.includes(stock.code)}
          onToggleSave={() => toggleWatchlist(stock.code)}
        />
      ))}
    </div>
  );

  const renderMacroTab = () => {
    if (!macroData) return null;
    return (
      <div className="p-4 sm:p-6 space-y-8">
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Globe className="w-5 h-5 text-indigo-600" />
            주요 거시경제 지표
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {macroData.indicators.map((ind, idx) => (
              <a 
                key={idx} 
                href={ind.link || '#'} 
                target="_blank" 
                rel="noopener noreferrer"
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start">
                  <span className="text-sm text-slate-500 font-medium group-hover:text-indigo-600 transition-colors">{ind.name}</span>
                  <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-indigo-400 transition-colors" />
                </div>
                <div className="mt-2 flex items-end gap-2">
                  <span className="text-2xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">{ind.value.toLocaleString()}<span className="text-sm font-normal text-slate-500 ml-1">{ind.unit}</span></span>
                </div>
                <div className="mt-2 flex items-center gap-1">
                  <div className={`flex items-center gap-1 text-sm font-medium ${ind.trend === 'up' ? 'text-rose-600' : ind.trend === 'down' ? 'text-blue-600' : 'text-slate-600'}`}>
                    {ind.trend === 'up' ? <TrendingUp className="w-4 h-4" /> : ind.trend === 'down' ? <TrendingDown className="w-4 h-4" /> : null}
                    <span>{ind.change > 0 ? '+' : ''}{ind.change} ({ind.changePercent > 0 ? '+' : ''}{ind.changePercent}%)</span>
                  </div>
                  <span className="text-xs text-slate-400 ml-1">전일 대비</span>
                </div>
                
                <div className="mt-4 pt-3 border-t border-slate-100 flex-1 flex flex-col gap-2 text-xs">
                  <div className={`flex items-start gap-1.5 ${ind.trend === 'up' ? 'text-rose-700 font-medium' : 'text-slate-500'}`}>
                    <TrendingUp className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span><span className="font-semibold">상승 시:</span> {ind.upImpact}</span>
                  </div>
                  <div className={`flex items-start gap-1.5 ${ind.trend === 'down' ? 'text-blue-700 font-medium' : 'text-slate-500'}`}>
                    <TrendingDown className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                    <span><span className="font-semibold">하락 시:</span> {ind.downImpact}</span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Newspaper className="w-5 h-5 text-indigo-600" />
            현 시점 매크로 인사이트
          </h2>
          <div className="space-y-4">
            {macroData.insights.map((insight, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-start gap-3">
                  {insight.impact === 'positive' ? <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5" /> : 
                   insight.impact === 'negative' ? <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" /> :
                   <Info className="w-6 h-6 text-blue-500 shrink-0 mt-0.5" />}
                  <div>
                    <h3 className="font-bold text-slate-900 text-base mb-2">{insight.title}</h3>
                    <p className="text-slate-600 text-sm leading-relaxed mb-3">{insight.description}</p>
                    <div className="flex flex-wrap gap-2">
                      <span className="text-xs text-slate-500 py-1">관련 테마:</span>
                      {insight.beneficiaries.map(b => (
                        <button key={b} onClick={() => { setActiveTab('THEME'); setSelectedTheme(b); }} className="text-xs px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md hover:bg-indigo-100 transition-colors">
                          #{b}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const allThemes = Array.from(new Set(stocks.flatMap(s => s.themes || []))).sort() as string[];
  const filteredThemes = allThemes.filter(theme => theme.toLowerCase().includes(themeSearchQuery.toLowerCase()));
  const themeStocks = selectedTheme ? stocks.filter(s => s.themes?.includes(selectedTheme)) : [];

  const renderThemeTab = () => {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            테마별 수혜주 찾기
          </h2>
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="테마 검색 (예: 화장품, 정치...)"
              value={themeSearchQuery}
              onChange={(e) => setThemeSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
            />
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            {themeSearchQuery && (
              <button 
                onClick={() => setThemeSearchQuery('')}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6 max-h-48 overflow-y-auto p-1 hide-scrollbar">
          {filteredThemes.length > 0 ? (
            filteredThemes.map(theme => (
              <button
                key={theme}
                onClick={() => setSelectedTheme(theme)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                  selectedTheme === theme 
                    ? 'bg-indigo-600 text-white shadow-md' 
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                }`}
              >
                #{theme}
              </button>
            ))
          ) : (
            <div className="text-sm text-slate-500 py-2">검색된 테마가 없습니다.</div>
          )}
        </div>
        
        {selectedTheme ? (
          themeStocks.length > 0 ? (
            <div className="bg-slate-50 rounded-xl p-1 border border-slate-100">
              {renderTable(themeStocks)}
              {renderCards(themeStocks)}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">해당 테마의 종목이 없습니다.</div>
          )
        ) : (
          <div className="text-center py-12 text-slate-500 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
            위에서 관심 있는 테마를 선택해보세요.
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans">
      {/* Header & Control Panel */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:h-16">
          <div className="flex items-center justify-between w-full sm:w-auto">
            <div className="flex items-center gap-2">
              <div className="bg-indigo-600 p-2 rounded-lg">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                YS Quant <span className="text-indigo-600">Jump</span>
              </h1>
            </div>
            
            {/* Visitor Badge */}
            <div className="hidden lg:flex items-center gap-3 ml-4 text-xs font-medium text-slate-500 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                오늘 <span className="text-slate-900 font-bold">{visitors.today.toLocaleString()}</span>
              </div>
              <div className="w-px h-3 bg-slate-300"></div>
              <div className="flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                총 <span className="text-slate-900 font-bold">{visitors.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto sm:flex-1 sm:max-w-md sm:ml-8">
            <form onSubmit={handleSearch} className="relative flex-1">
              <input
                type="text"
                placeholder="종목명 또는 코드 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-full text-sm focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all outline-none"
              />
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            </form>
            
            <button 
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors disabled:opacity-50 shrink-0"
              title="데이터 새로고침"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Live Indices */}
        {indices && indices.length > 0 && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            {indices.map((ind, idx) => (
              <a 
                key={idx} 
                href={ind.name === 'KOSPI' ? 'https://finance.naver.com/sise/sise_index.naver?code=KOSPI' : ind.name === 'KOSDAQ' ? 'https://finance.naver.com/sise/sise_index.naver?code=KOSDAQ' : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 shrink-0 hover:shadow-md transition-shadow cursor-pointer block"
              >
                <span className="text-sm font-bold text-slate-700">{ind.name}</span>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className={`text-2xl font-black ${ind.change > 0 ? 'text-rose-600' : ind.change < 0 ? 'text-blue-600' : 'text-slate-700'}`}>
                    {ind.value.toLocaleString()}
                  </span>
                </div>
                <div className={`mt-1 flex items-center gap-1 text-sm font-medium ${ind.change > 0 ? 'text-rose-600' : ind.change < 0 ? 'text-blue-600' : 'text-slate-500'}`}>
                  {ind.change > 0 ? <TrendingUp className="w-4 h-4" /> : ind.change < 0 ? <TrendingDown className="w-4 h-4" /> : null}
                  <span>{ind.change > 0 ? '+' : ''}{ind.change} ({ind.changePercent > 0 ? '+' : ''}{ind.changePercent}%)</span>
                </div>
              </a>
            ))}
          </div>
        )}

        {/* Real-time News Section */}
        <div className="mb-8 bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-bold text-slate-900">실시간 증시 뉴스</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {loading ? (
              [...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse"></div>
              ))
            ) : (
              news.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => window.open(item.link, '_blank')}
                  className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 hover:bg-slate-100 transition-colors group cursor-pointer"
                >
                  <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500 group-hover:scale-150 transition-transform"></span>
                  <p className="text-sm text-slate-700 font-medium line-clamp-1 group-hover:text-indigo-600 transition-colors" dangerouslySetInnerHTML={{ __html: item.title }}></p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Value Indicator Guide */}
        <div className="mb-6 bg-indigo-50/50 rounded-xl p-4 border border-indigo-100 text-sm text-indigo-900">
          <h3 className="font-bold mb-2 flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600" />
            종합 평가 및 가치지표 해석 가이드
          </h3>
          <ul className="list-disc list-inside space-y-1 text-indigo-800/80 text-xs sm:text-sm">
            <li><strong>총점:</strong> 가치 점수(펀더멘탈), 기술적 지표(모멘텀), 수급 및 뉴스 분석을 종합하여 100점 만점으로 산출한 AI 종합 평가 점수입니다.</li>
            <li><strong>가치 점수:</strong> ROE, PER, PBR, PEG, FCF 5가지 핵심 가치 지표를 각 20점씩 총 100점 만점으로 절대평가한 점수입니다.</li>
            <li><strong>높을수록 좋은 지표:</strong> ROE(자기자본이익률), FCF(잉여현금흐름)</li>
            <li><strong>낮을수록 좋은 지표 (저평가):</strong> PER(주가수익비율), PBR(주가순자산비율), PEG(주가수익성장비율)</li>
            <li>표의 괄호 안 수치는 <strong>동종업계(섹터) 평균</strong>입니다. 지표가 업계 평균보다 우수할 경우 <span className="text-emerald-600 font-bold">초록색</span>으로 표시됩니다.</li>
          </ul>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-200/50 p-1 rounded-xl mb-6 max-w-3xl mx-auto md:mx-0 overflow-x-auto hide-scrollbar">
          {(['WATCHLIST', 'KOSPI', 'KOSDAQ', 'MACRO', 'THEME', 'UPGRADED'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[80px] py-2.5 text-sm font-medium rounded-lg transition-all whitespace-nowrap px-2 ${
                activeTab === tab 
                  ? 'bg-white text-indigo-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
              }`}
            >
              {tab === 'WATCHLIST' && <Star className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />}
              {tab === 'MACRO' && <Globe className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />}
              {tab === 'THEME' && <Layers className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />}
              {tab === 'UPGRADED' && <TrendingUp className="w-4 h-4 inline-block mr-1.5 -mt-0.5" />}
              {tab === 'WATCHLIST' ? '관심 종목' : tab === 'MACRO' ? '거시경제' : tab === 'THEME' ? '테마별' : tab === 'UPGRADED' ? '목표가 상향' : tab}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden min-h-[500px]">
          {loading ? (
            <div className="p-8 space-y-4">
              {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className={refreshing ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}
              >
                {activeTab === 'WATCHLIST' && (
                  watchlistedStocks.length > 0 ? (
                    <>
                      {renderTable(watchlistedStocks)}
                      {renderCards(watchlistedStocks)}
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-slate-400">
                      <Star className="w-12 h-12 mb-4 text-slate-300" />
                      <p>관심 종목이 없습니다.</p>
                      <p className="text-sm mt-1">종목 옆의 별표를 눌러 추가해보세요.</p>
                    </div>
                  )
                )}
                {activeTab === 'KOSPI' && (
                  <>
                    {renderTable(kospiStocks)}
                    {renderCards(kospiStocks)}
                  </>
                )}
                {activeTab === 'KOSDAQ' && (
                  <>
                    {renderTable(kosdaqStocks)}
                    {renderCards(kosdaqStocks)}
                  </>
                )}
                {activeTab === 'MACRO' && renderMacroTab()}
                {activeTab === 'THEME' && renderThemeTab()}
                {activeTab === 'UPGRADED' && (
                  <>
                    {renderTable(stocks.filter(s => s.targetUpgraded))}
                    {renderCards(stocks.filter(s => s.targetUpgraded))}
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>

      {/* Search Popup */}
      <AnimatePresence>
        {showSearchPopup && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40"
              onClick={() => setShowSearchPopup(false)}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-white rounded-2xl shadow-xl border border-slate-200 z-50 overflow-hidden"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">검색 결과</h3>
                <button onClick={() => setShowSearchPopup(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="max-h-[60vh] overflow-y-auto p-4">
                {searchResults.length > 0 ? (
                  <div className="space-y-3">
                    {searchResults.map(stock => (
                      <StockCard 
                        key={stock.id} 
                        stock={stock} 
                        isSaved={watchlist.includes(stock.code)}
                        onToggleSave={() => toggleWatchlist(stock.code)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    검색 결과가 없습니다.
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Subcomponents

const StockTableRow: React.FC<{ stock: Stock, rank: number, isSaved: boolean, onToggleSave: () => void }> = ({ stock, rank, isSaved, onToggleSave }) => {
  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
      <td className="px-4 py-4 text-center">
        <button onClick={onToggleSave} className="focus:outline-none">
          <Star className={`w-5 h-5 transition-colors ${isSaved ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 hover:text-yellow-400'}`} />
        </button>
      </td>
      <td className="px-4 py-4 text-center font-medium text-slate-500">{rank}</td>
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <div 
              onClick={() => window.open(`https://finance.naver.com/item/main.naver?code=${stock.code}`, '_blank')}
              className="font-bold text-slate-900 hover:text-indigo-600 transition-colors flex items-center gap-1 cursor-pointer"
            >
              {stock.name}
              <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-sm font-semibold text-slate-700">현재가 {stock.currentPrice.toLocaleString()}원</span>
          </div>
          <span className="text-xs text-slate-500 mb-1">{stock.code} · {stock.sector}</span>
          <div className="flex flex-wrap gap-1">
            {stock.themes?.map(theme => (
              <span key={theme} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">#{theme}</span>
            ))}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-indigo-50 text-indigo-700 font-bold text-sm">
          {stock.score}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col">
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-slate-900">{stock.targetPrice.toLocaleString()}원</span>
            <span className={`text-xs font-medium ${stock.disparity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {stock.disparity > 0 ? '+' : ''}{stock.disparity}%
            </span>
          </div>
          <span className="text-xs text-slate-500">{stock.targetBroker} · {stock.targetDate}</span>
        </div>
      </td>
      <td className="px-4 py-4 text-center">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-sm">
          {stock.valueScore}
        </span>
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-col gap-1.5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600">
            <IndicatorRow label="ROE" desc="자기자본이익률" direction="up" value={stock.roe} sector={stock.sectorRoe} unit="%" />
            <IndicatorRow label="PER" desc="주가수익비율" direction="down" value={stock.per} sector={stock.sectorPer} />
            <IndicatorRow label="PBR" desc="주가순자산비율" direction="down" value={stock.pbr} sector={stock.sectorPbr} />
            <IndicatorRow label="PEG" desc="주가수익성장비율" direction="down" value={stock.peg} sector={stock.sectorPeg} />
            <IndicatorRow label="FCF" desc="잉여현금흐름" direction="up" value={stock.fcf} sector={stock.sectorFcf} />
          </div>
          <div className="mt-1 text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md inline-block w-fit">
            {getValueSummary(stock)}
          </div>
        </div>
      </td>
      <td className="px-4 py-4">
        {stock.signal === 'BUY' ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            [적극매수]
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            [대기] 눌림목
          </span>
        )}
      </td>
      <td className="px-4 py-4">
        <div 
          onClick={(e) => {
            e.stopPropagation();
            window.open(`https://finance.naver.com/item/news.naver?code=${stock.code}`, '_blank');
          }}
          className="text-sm text-slate-600 hover:text-indigo-600 line-clamp-2 max-w-[200px] transition-colors cursor-pointer"
          title={stock.news}
        >
          "{stock.news}"
        </div>
      </td>
    </tr>
  );
}

const StockCard: React.FC<{ stock: Stock, rank?: number, isSaved: boolean, onToggleSave: () => void }> = ({ stock, rank, isSaved, onToggleSave }) => {
  return (
    <div 
      className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all cursor-pointer group/card"
      onClick={() => window.open(`https://finance.naver.com/item/main.naver?code=${stock.code}`, '_blank')}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
        <div className="flex items-start gap-3">
          {rank && <span className="text-sm font-bold text-slate-400 w-5 mt-1">{rank}.</span>}
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-bold text-slate-900 text-lg group-hover/card:text-indigo-600 transition-colors">
                {stock.name}
              </span>
              <span className="text-sm font-semibold text-slate-700">현재가 {stock.currentPrice.toLocaleString()}원</span>
            </div>
            <span className="text-xs text-slate-500 block mb-1.5">{stock.code} · {stock.market} · {stock.sector}</span>
            <div className="flex flex-wrap gap-1">
              {stock.themes?.map(theme => (
                <span key={theme} className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md border border-slate-200">#{theme}</span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-sm" title="총점">
            {stock.score}점
          </span>
          <span className="inline-flex items-center justify-center px-2 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold text-sm" title="가치 점수">
            가치 {stock.valueScore}점
          </span>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              onToggleSave();
            }} 
            className="p-1 hover:scale-110 transition-transform ml-1"
          >
            <Star className={`w-6 h-6 transition-colors ${isSaved ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300 hover:text-yellow-400'}`} />
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 bg-slate-50 rounded-lg p-3">
        <div>
          <span className="block text-xs text-slate-500 mb-1">목표가</span>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-slate-900">{stock.targetPrice.toLocaleString()}원</span>
            <span className={`text-xs font-medium ${stock.disparity > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              ({stock.disparity > 0 ? '+' : ''}{stock.disparity}%)
            </span>
          </div>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{stock.targetBroker} · {stock.targetDate}</span>
        </div>
        <div>
          <span className="block text-xs text-slate-500 mb-1">가치 지표 <span className="text-[10px] font-normal">(괄호는 업종평균)</span></span>
          <div className="grid grid-cols-1 gap-y-1 text-xs text-slate-700">
            <IndicatorRow label="ROE" desc="자기자본이익률" direction="up" value={stock.roe} sector={stock.sectorRoe} unit="%" />
            <IndicatorRow label="PER" desc="주가수익비율" direction="down" value={stock.per} sector={stock.sectorPer} />
            <IndicatorRow label="PBR" desc="주가순자산비율" direction="down" value={stock.pbr} sector={stock.sectorPbr} />
            <IndicatorRow label="PEG" desc="주가수익성장비율" direction="down" value={stock.peg} sector={stock.sectorPeg} />
            <IndicatorRow label="FCF" desc="잉여현금흐름" direction="up" value={stock.fcf} sector={stock.sectorFcf} />
          </div>
          <div className="mt-2 text-[11px] font-medium text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md inline-block w-fit">
            {getValueSummary(stock)}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
        <div className="flex-1 pr-4">
          <div 
            onClick={(e) => {
              e.stopPropagation();
              window.open(`https://finance.naver.com/item/news.naver?code=${stock.code}`, '_blank');
            }}
            className="text-sm text-slate-600 hover:text-indigo-600 line-clamp-1 transition-colors cursor-pointer"
            title={stock.news}
          >
            "{stock.news}"
          </div>
        </div>
        <div>
          {stock.signal === 'BUY' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200/50 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              적극매수
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 text-xs font-bold border border-amber-200/50 whitespace-nowrap">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
              대기
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 p-4 animate-pulse">
      <div className="w-5 h-5 bg-slate-200 rounded-full shrink-0"></div>
      <div className="w-8 h-4 bg-slate-200 rounded shrink-0"></div>
      <div className="w-24 h-5 bg-slate-200 rounded shrink-0"></div>
      <div className="w-10 h-10 bg-slate-200 rounded-full shrink-0 mx-4"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-1/2"></div>
        <div className="h-3 bg-slate-200 rounded w-1/3"></div>
      </div>
      <div className="w-20 h-6 bg-slate-200 rounded shrink-0"></div>
    </div>
  );
}

const IndicatorRow: React.FC<{ label: string, desc: string, direction: 'up' | 'down', value: number, sector: number, unit?: string }> = ({ label, desc, direction, value, sector, unit = '' }) => {
  const isBetter = direction === 'up' ? value > sector : value < sector;
  const colorClass = isBetter ? 'text-emerald-600 font-semibold' : 'text-slate-500';
  return (
    <div className="flex justify-between items-center w-full gap-2">
      <span className="cursor-help border-b border-dotted border-slate-400 whitespace-nowrap text-slate-500" title={`${desc} (${direction === 'up' ? '높을수록' : '낮을수록'} 긍정적)`}>
        {label}<span className="text-[10px] ml-0.5">{direction === 'up' ? '↑' : '↓'}</span>
      </span>
      <div className="text-right whitespace-nowrap">
        <span className={colorClass}>{value}{unit}</span>
        <span className="text-[10px] text-slate-400 ml-1">({sector}{unit})</span>
      </div>
    </div>
  );
}

function getValueSummary(stock: Stock) {
  const goodPoints = [];
  if (stock.roe > stock.sectorRoe) goodPoints.push('ROE');
  if (stock.per > 0 && stock.per < stock.sectorPer) goodPoints.push('PER');
  if (stock.pbr > 0 && stock.pbr < stock.sectorPbr) goodPoints.push('PBR');
  if (stock.peg > 0 && stock.peg < stock.sectorPeg) goodPoints.push('PEG');
  if (stock.fcf > stock.sectorFcf) goodPoints.push('FCF');

  if (goodPoints.length === 0) {
    return '업계 대비 지표 열위';
  } else if (goodPoints.length === 5) {
    return '모든 지표 업계 대비 우수';
  } else {
    return `업계 대비 ${goodPoints.join(', ')} 우수`;
  }
}
