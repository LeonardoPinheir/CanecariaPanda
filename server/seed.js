// Dados iniciais da loja nova. Tudo aqui pode ser editado ou apagado pelo painel.

const now = () => new Date().toISOString();

export function seedData() {
  const t = now();
  const categories = [
    { id: 'cat-canecas', name: 'Canecas', slug: 'canecas', order: 1 },
    { id: 'cat-presentes', name: 'Presentes e kits', slug: 'presentes', order: 2 },
    { id: 'cat-vestuario', name: 'Camisetas', slug: 'camisetas', order: 3 },
    { id: 'cat-decoracao', name: 'Casa e decoração', slug: 'decoracao', order: 4 },
    { id: 'cat-brindes', name: 'Brindes para empresas', slug: 'brindes', order: 5 },
  ];
  const p = (id, name, categoryId, price, cost, art, extra = {}) => ({
    id, name, slug: id, categoryId, price, costPrice: cost,
    description: '', images: [], art, active: true, featured: false,
    customizable: true, customLabel: 'Nome ou frase para personalizar',
    trackStock: false, stock: 0, minStock: 0, sku: '', createdAt: t, updatedAt: t, ...extra,
  });
  const products = [
    p('caneca-ceramica-classica', 'Caneca de cerâmica clássica', 'cat-canecas', 39.9, 14, { kind: 'caneca', color: '#ffffff' }, {
      featured: true,
      description: 'Caneca de cerâmica branca de 325 ml com a sua arte, foto ou frase. Impressão por sublimação que não desbota na lavagem à mão.',
    }),
    p('caneca-alca-colorida', 'Caneca com alça e interior coloridos', 'cat-canecas', 44.9, 16.5, { kind: 'caneca', color: '#ffffff', accent: '#F26B1D' }, {
      featured: true,
      description: 'Cerâmica de 325 ml com alça e parte de dentro coloridas. Escolha a cor no pedido.',
    }),
    p('caneca-magica', 'Caneca mágica', 'cat-canecas', 59.9, 24, { kind: 'caneca', color: '#1d1d1d' }, {
      featured: true,
      description: 'Preta por fora, revela a estampa quando recebe bebida quente. Um presente que sempre surpreende.',
    }),
    p('xicara-cafe', 'Xícara de café com pires', 'cat-canecas', 34.9, 12, { kind: 'xicara', color: '#ffffff' }, {
      description: 'Xícara de 180 ml com pires, personalizada com nome ou logotipo.',
    }),
    p('caneca-chopp', 'Caneca de chopp de vidro', 'cat-canecas', 49.9, 19, { kind: 'chopp', color: '#f5d77a' }, {
      description: 'Caneca de vidro jateado de 475 ml, ótima para padrinhos e aniversários.',
    }),
    p('kit-cafe-da-manha', 'Kit café da manhã', 'cat-presentes', 119.9, 52, { kind: 'kit', color: '#F26B1D' }, {
      featured: true,
      description: 'Caneca personalizada, cesta, chocolate e cartão com mensagem. Montamos e embalamos para presente.',
    }),
    p('camiseta-personalizada', 'Camiseta personalizada', 'cat-vestuario', 54.9, 22, { kind: 'camiseta', color: '#ffffff' }, {
      description: 'Camiseta de poliéster com toque de algodão, estampa frente ou costas. Tamanhos do P ao GG.',
      customLabel: 'Tamanho e texto da estampa',
    }),
    p('almofada-personalizada', 'Almofada com foto', 'cat-decoracao', 49.9, 20, { kind: 'almofada', color: '#ffffff' }, {
      description: 'Almofada de 30 x 30 cm com enchimento, estampada com a foto que você enviar.',
    }),
    p('squeeze-aluminio', 'Squeeze de alumínio', 'cat-brindes', 36.9, 15, { kind: 'squeeze', color: '#2F7D32' }, {
      description: 'Garrafa de alumínio de 500 ml. Ótima para brindes de empresas e academias. Desconto por quantidade.',
    }),
    p('quadro-decorativo', 'Quadro decorativo', 'cat-decoracao', 69.9, 28, { kind: 'quadro', color: '#ffffff' }, {
      description: 'Quadro em MDF de 20 x 30 cm com a arte escolhida. Acompanha suporte para parede.',
    }),
  ];

  const settings = {
    storeName: 'Canecaria Panda',
    tagline: 'Personalizados com amor',
    heroTitle: 'Canecas e presentes com o nome de quem você gosta',
    heroText: 'Personalizamos canecas, camisetas, kits e brindes em Araguaína. Escolha o produto, conte o que quer estampar e acompanhe a produção pelo site.',
    whatsapp: '',
    instagram: '',
    email: '',
    address: 'Araguaína - TO',
    hours: 'Segunda a sexta, 8h às 18h. Sábado, 8h às 12h.',
    pixKey: '',
    pixName: '',
    deliveryFee: 10,
    freeDeliveryFrom: 150,
    allowPickup: true,
    allowDelivery: true,
    productionDays: '3 a 5 dias úteis',
    paymentMethods: ['Pix', 'Cartão de crédito', 'Cartão de débito', 'Dinheiro'],
    about: 'A Canecaria Panda nasceu para transformar lembranças em presentes. Cada peça é impressa e conferida por nós, uma a uma.',
    services: [
      { title: 'Personalização de canecas', text: 'Sublimação em cerâmica, mágica, vidro e porcelana, a partir de uma unidade.' },
      { title: 'Brindes corporativos', text: 'Canecas, squeezes e camisetas com a marca da sua empresa, com preço por quantidade.' },
      { title: 'Lembrancinhas de festa', text: 'Aniversários, casamentos, chá de bebê e formaturas, com arte combinando com o tema.' },
      { title: 'Criação de arte', text: 'Não tem a arte pronta? A gente cria a partir da sua ideia e manda para aprovação.' },
      { title: 'Impressão e serviços gráficos', text: 'Adesivos, cartões, etiquetas e tags para pequenos negócios.' },
    ],
    financeCategories: {
      receita: ['Vendas', 'Serviços', 'Outras receitas'],
      despesa: ['Matéria-prima', 'Embalagens', 'Aluguel', 'Energia e internet', 'Marketing', 'Entregas', 'Outras despesas'],
    },
  };

  return {
    settings,
    categories,
    products,
    customers: [],
    orders: [],
    coupons: [
      { id: 'cupom-bemvindo', code: 'BEMVINDO10', type: 'percent', value: 10, minTotal: 50, active: true, expiresAt: '', maxUses: 0, uses: 0, createdAt: t },
    ],
    finance: [],
    stock: [],
    admins: [],
  };
}
