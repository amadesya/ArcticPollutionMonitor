
import React from 'react';

interface HomePageProps {
  onNavigate: () => void;
}

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h2 className="text-3xl md:text-4xl font-bold text-white text-center tracking-wide">{children}</h2>
);

const SectionSubtitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-4 text-lg text-gray-400 max-w-3xl mx-auto text-center">{children}</p>
);

const FeatureCard: React.FC<{ icon: string; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
    <div className="flex items-center space-x-3 mb-3">
      <i className={`ph-bold ${icon} text-2xl text-cyan-400`}></i>
      <h3 className="font-bold text-xl text-white">{title}</h3>
    </div>
    <p className="text-gray-400">{children}</p>
  </div>
);

const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  return (
    <div className="bg-gray-900 text-gray-300 h-screen w-screen overflow-y-auto font-sans">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <i className="ph-bold ph-planet text-3xl text-cyan-400"></i>
          <h1 className="text-lg font-bold text-white tracking-wider hidden sm:block">АРКТИЧЕСКИЙ МОНИТОР</h1>
        </div>
        <button
          onClick={onNavigate}
          className="px-5 py-2 bg-cyan-600 text-white font-bold text-sm rounded-md hover:bg-cyan-500 transition-colors transform hover:scale-105 shadow-lg shadow-cyan-500/20 flex items-center space-x-2"
        >
          <i className="ph-bold ph-satellite"></i>
          <span>К МОНИТОРИНГУ</span>
        </button>
      </header>

      <main className="container mx-auto px-4">
        {/* Hero Section */}
        <section className="text-center py-20 md:py-32">
          <h1 className="text-4xl md:text-6xl font-extrabold text-white tracking-tight leading-tight">
            ЗОНА ОБНАРУЖЕНИЯ <span className="text-cyan-400">ЗАГРЯЗНЕНИЯ</span>
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-lg md:text-xl text-gray-400">
            Космическая миссия и веб-сервис для мониторинга зон загрязнения в арктическом регионе
          </p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto text-left">
            <FeatureCard icon="ph-cube" title="CubeSat мониторинг">
              Малый космический аппарат для оперативного обнаружения загрязнений.
            </FeatureCard>
            <FeatureCard icon="ph-timer" title="Реальное время">
              Обработка данных и оповещение в режиме реального времени.
            </FeatureCard>
            <FeatureCard icon="ph-snowflake" title="Арктический регион">
              Специализированное решение для экстремальных условий Арктики.
            </FeatureCard>
          </div>
        </section>

        {/* Why it's important Section */}
        <section className="py-16">
          <SectionTitle>ПОЧЕМУ ЭТО ВАЖНО?</SectionTitle>
          <SectionSubtitle>
            Арктика — зона повышенного экологического риска. Традиционные методы мониторинга не справляются с масштабом задачи.
          </SectionSubtitle>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard icon="ph-clock-countdown" title="Критическое время реагирования">
              Разлив нефти увеличивает площадь экспоненциально в первые часы. Промедление на 6-12 часов делает ликвидацию в разы дороже и менее эффективной.
            </FeatureCard>
            <FeatureCard icon="ph-binoculars" title="Недостаточное покрытие">
              Патрульные самолёты и корабли работают эпизодически. Большая часть акватории физически не просматривается наземными средствами.
            </FeatureCard>
            <FeatureCard icon="ph-wind" title="Экстремальные условия">
              Сложная навигация, ледовые поля, высокая облачность и низкая плотность инфраструктуры делают мониторинг крайне затруднительным.
            </FeatureCard>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center max-w-4xl mx-auto">
            <div><p className="text-4xl font-bold text-cyan-400">×10</p><p className="mt-2 text-gray-400">Рост стоимости ликвидации при задержке</p></div>
            <div><p className="text-4xl font-bold text-cyan-400">80%</p><p className="mt-2 text-gray-400">Акватории без постоянного наблюдения</p></div>
            <div><p className="text-4xl font-bold text-cyan-400">6-12ч</p><p className="mt-2 text-gray-400">Критическое окно для начала реагирования</p></div>
            <div><p className="text-4xl font-bold text-cyan-400">100%</p><p className="mt-2 text-gray-400">Необходимое покрытие для эффективности</p></div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="py-16">
          <SectionTitle>РЕШЕНИЕ</SectionTitle>
          <SectionSubtitle>
            Интегрированная система космического мониторинга и веб-аналитики для непрерывного контроля арктических вод.
          </SectionSubtitle>
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
            <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <i className="ph-bold ph-satellite text-3xl text-cyan-400"></i>
                <h3 className="font-bold text-2xl text-white">Космический сегмент</h3>
              </div>
              <ul className="space-y-2 list-disc list-inside text-gray-400">
                <li>Малый космический аппарат формата CubeSat</li>
                <li>Частое покрытие арктического региона</li>
                <li>Оптимизированная орбита для полярных широт</li>
                <li>Низкая стоимость запуска и эксплуатации</li>
              </ul>
            </div>
            <div className="bg-gray-800/50 p-8 rounded-lg border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <i className="ph-bold ph-chart-line-up text-3xl text-cyan-400"></i>
                <h3 className="font-bold text-2xl text-white">Веб-сервис и аналитика</h3>
              </div>
              <ul className="space-y-2 list-disc list-inside text-gray-400">
                <li>Автоматическая обработка спутниковых данных</li>
                <li>ML-алгоритмы детекции и классификации загрязнений</li>
                <li>Геопространственная визуализация в реальном времени</li>
                <li>API для интеграции с системами реагирования</li>
                <li>Аналитика трендов и временных рядов</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Mission Goals Section */}
        <section className="py-16">
          <SectionTitle>ЦЕЛИ МИССИИ</SectionTitle>
          <SectionSubtitle>
            Комплексный подход к мониторингу экологической обстановки в арктическом регионе.
          </SectionSubtitle>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
            <FeatureCard icon="ph-magnifying-glass" title="Обнаружение и классификация">
              Детекция загрязнений морской поверхности: масло, нефтепродукты, химические разливы и другие типы загрязнений.
            </FeatureCard>
            <FeatureCard icon="ph-map-pin" title="Регистрация и геолокация">
              Точная фиксация координат, площади распространения, времени наблюдения и вероятности обнаружения.
            </FeatureCard>
            <FeatureCard icon="ph-chart-bar" title="Временные ряды и аналитика">
              Накопление данных для анализа динамики распространения загрязнений и выявления трендов.
            </FeatureCard>
            <FeatureCard icon="ph-plugs-connected" title="Интеграция и доступность">
              Предоставление API и веб-интерфейса для визуализации, загрузки данных и интеграции с системами экстренного реагирования.
            </FeatureCard>
          </div>
        </section>

        {/* System Capabilities Section */}
        <section className="py-16">
          <SectionTitle>ВОЗМОЖНОСТИ СИСТЕМЫ</SectionTitle>
          <SectionSubtitle>
            Комплексный функционал для эффективного мониторинга и реагирования.
          </SectionSubtitle>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[{i: '01', t: 'Автоматизированная детекция', d: 'Исключение человеческого фактора и обеспечение непрерывного круглосуточного мониторинга.'},
            {i: '02', t: 'Геопространственная визуализация', d: 'Интерактивные карты с наложением данных о загрязнениях, ледовой обстановке и судоходных путях.'},
            {i: '03', t: 'Система оповещений', d: 'Автоматическая отправка уведомлений заинтересованным службам при обнаружении инцидентов.'},
            {i: '04', t: 'Аналитика и прогнозирование', d: 'Анализ временных рядов для выявления паттернов и прогнозирования зон риска.'},
            {i: '05', t: 'Открытый API', d: 'Интеграция с существующими системами мониторинга и реагирования через RESTful API.'},
            {i: '06', t: 'Экономическая эффективность', d: 'ROI достигается за счёт предотвращения крупных инцидентов и снижения затрат на ликвидацию.'},
            ].map(item => (
              <div key={item.i} className="bg-gray-800/50 border border-gray-700 p-6 rounded-lg relative">
                <div className="absolute top-4 right-4 text-5xl font-extrabold text-gray-700/50">{item.i}</div>
                <h3 className="font-bold text-xl text-white mt-4 mb-2">{item.t}</h3>
                <p className="text-gray-400">{item.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Implementation Stages Section */}
        <section className="py-16">
          <SectionTitle>ЭТАПЫ РЕАЛИЗАЦИИ</SectionTitle>
          <SectionSubtitle>
            Поэтапный подход к развёртыванию системы мониторинга.
          </SectionSubtitle>
          <div className="mt-16 max-w-2xl mx-auto">
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-5 bottom-0 w-0.5 bg-gray-700"></div>
              {[
                { i: '01', t: 'Подготовка миссии и запуск', d: 'Разработка и тестирование космического аппарата формата CubeSat. Выбор орбиты обеспечивающей оптимальное покрытие.', icon: 'ph-rocket-launch' },
                { i: '02', t: 'Развёртывание наземной инфраструктуры', d: 'Создание центров приёма и обработки данных.', icon: 'ph-server' },
                { i: '03', t: 'Калибровка и тестирование', d: 'Отладка ML-моделей и валидация данных.', icon: 'ph-check-circle' },
                { i: '04', t: 'Операционная фаза мониторинга', d: 'Запуск непрерывного мониторинга и системы оповещений.', icon: 'ph-broadcast' },
                { i: '05', t: 'Развитие системы', d: 'Расширение функционала, подключение новых источников данных.', icon: 'ph-arrows-clockwise' },
              ].map((step) => (
                <div key={step.i} className="flex items-start mb-12">
                  <div className="flex-shrink-0 z-10 w-10 h-10 bg-gray-800 border-2 border-cyan-500 rounded-full flex items-center justify-center">
                    <i className={`ph-bold ${step.icon} text-cyan-400 text-xl`}></i>
                  </div>
                  <div className="ml-6">
                    <p className="text-xs text-cyan-400 font-bold tracking-wider">ЭТАП {step.i}</p>
                    <h3 className="text-xl font-bold text-white mt-1">{step.t}</h3>
                    <p className="text-gray-400 mt-2">{step.d}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Strategic Value Section */}
        <section className="py-16">
          <SectionTitle>Стратегическое значение</SectionTitle>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
             <FeatureCard icon="ph-shield-check" title="Экологическая безопасность">Снижение рисков и минимизация ущерба для защиты уникальных арктических экосистем.</FeatureCard>
             <FeatureCard icon="ph-chart-line-up" title="Экономическая эффективность">Стоимость инцидента многократно превышает инвестиции в систему мониторинга.</FeatureCard>
             <FeatureCard icon="ph-globe-hemisphere-west" title="Международное сотрудничество">Открытая система данных способствует сотрудничеству в области охраны окружающей среды.</FeatureCard>
             <FeatureCard icon="ph-medal" title="Технологическое лидерство">Развитие компетенций в области малых космических аппаратов и машинного обучения.</FeatureCard>
          </div>
        </section>
      </main>
      
      <footer className="text-center py-8 mt-16 border-t border-gray-800">
        <p className="text-gray-500">&copy; {new Date().getFullYear()} Проект "Монитор Загрязнения Арктики". Все права защищены.</p>
      </footer>
    </div>
  );
};

export default HomePage;
