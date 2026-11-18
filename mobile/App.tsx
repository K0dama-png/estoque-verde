import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { AppHeader } from './src/components/AppHeader';
import { BottomNav } from './src/components/BottomNav';
import { MovementModal, ProductDetailModal, ProductFormModal, StockExitModal } from './src/components/AppModals';
import { CategoriesScreen } from './src/screens/CategoriesScreen';
import { ChangePasswordScreen } from './src/screens/ChangePasswordScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { MovementsScreen } from './src/screens/MovementsScreen';
import { ProductsScreen } from './src/screens/ProductsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { RegisterScreen } from './src/screens/RegisterScreen';
import { ReportsScreen } from './src/screens/ReportsScreen';
import { SuppliersScreen } from './src/screens/SuppliersScreen';
import { UsersScreen } from './src/screens/UsersScreen';
import { API_URL, ApiError, setApiAccessToken, setUnauthorizedHandler } from './src/services/apiClient';
import { authApi, categoriesApi, inventoryApi, loadApplicationData, productsApi, suppliersApi, usersApi } from './src/services/inventoryApi';
import { notifyStockAlerts } from './src/services/notifications';
import { readAccessToken, removeAccessToken, saveAccessToken } from './src/services/session';
import { colors } from './src/theme';
import type { Batch, Category, EmployeeRegistrationInput, Market, Movement, MovementType, Product, RegistrationInput, ScreenKey, StockExitItemInput, StockExitReason, Supplier, SupplierRegistrationInput, User } from './src/types';
import { daysUntilExpiry, isLowStock } from './src/utils';

const screenTitles: Record<ScreenKey, { title: string; subtitle: string }> = {
  dashboard: { title: 'Visão geral', subtitle: 'Resumo do seu mercado' },
  products: { title: 'Produtos', subtitle: 'Consulta e controle do estoque' },
  categories: { title: 'Categorias', subtitle: 'Organização do catálogo de produtos' },
  suppliers: { title: 'Fornecedores', subtitle: 'Parceiros e origem das mercadorias' },
  movements: { title: 'Movimentações', subtitle: 'Entradas e saídas registradas' },
  users: { title: 'Equipe', subtitle: 'Funcionários do seu mercado' },
  reports: { title: 'Relatórios', subtitle: 'Indicadores para tomada de decisão' },
  profile: { title: 'Minha conta', subtitle: 'Dados e segurança do acesso' },
};

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [authBusy, setAuthBusy] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [user, setUser] = useState<User>();
  const [market, setMarket] = useState<Market>();
  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [registrationError, setRegistrationError] = useState('');
  const [screen, setScreen] = useState<ScreenKey>('dashboard');
  const [previousScreen, setPreviousScreen] = useState<ScreenKey>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [productFormOpen, setProductFormOpen] = useState(false);
  const [movementType, setMovementType] = useState<MovementType>();
  const [selectedProduct, setSelectedProduct] = useState<Product>();
  const accessToken = useRef<string | undefined>(undefined);
  const lastNotificationSignature = useRef('');

  const activeProducts = useMemo(() => products.filter((product) => product.active), [products]);
  const activeCategories = useMemo(() => categories.filter((category) => category.active), [categories]);
  const activeSuppliers = useMemo(() => suppliers.filter((supplier) => supplier.active), [suppliers]);
  const employees = useMemo(() => users.filter((candidate) => candidate.role === 'EMPLOYEE'), [users]);
  const selectedProductBatches = useMemo(
    () => selectedProduct ? batches.filter((batch) => batch.productId === selectedProduct.id && batch.quantity > 0) : [],
    [batches, selectedProduct],
  );

  useEffect(() => {
    setUnauthorizedHandler(() => { void endSession(true); });
    let mounted = true;

    const restoreSession = async () => {
      try {
        const token = await readAccessToken();
        if (!token) return;
        accessToken.current = token;
        setApiAccessToken(token);
        const session = await authApi.me();
        if (!mounted) return;
        setUser(session.user);
        setMarket(session.market);
        if (session.user.mustChangePassword) {
          await removeAccessToken();
          accessToken.current = undefined;
          setApiAccessToken(undefined);
          setUser(undefined);
          setMarket(undefined);
          setLoginError('Entre novamente com a senha temporária para concluir o primeiro acesso.');
          return;
        }
        await refreshData(session.user, mounted);
      } catch (error) {
        if (mounted) setLoginError(errorMessage(error));
        await removeAccessToken();
        accessToken.current = undefined;
        setApiAccessToken(undefined);
      } finally {
        if (mounted) setAppReady(true);
      }
    };

    void restoreSession();
    return () => {
      mounted = false;
      setUnauthorizedHandler(undefined);
    };
  }, []);

  useEffect(() => {
    if (!user || user.role !== 'ADMIN' || user.mustChangePassword || !market) return;
    const lowStockProducts = activeProducts.filter(isLowStock);
    const expiringBatches = batches.filter((batch) => batch.quantity > 0 && daysUntilExpiry(batch.expiryDate) <= 30);
    if (lowStockProducts.length === 0 && expiringBatches.length === 0) {
      lastNotificationSignature.current = '';
      return;
    }
    const signature = `${user.marketId}|${lowStockProducts.map((product) => `${product.id}:${product.quantity}`).join(',')}|${expiringBatches.map((batch) => `${batch.id}:${batch.quantity}`).join(',')}`;
    if (signature === lastNotificationSignature.current) return;
    lastNotificationSignature.current = signature;
    void notifyStockAlerts({ marketName: market.name, lowStockCount: lowStockProducts.length, expiringBatchCount: expiringBatches.length });
  }, [activeProducts, batches, market, user]);

  async function refreshData(sessionUser = user, mounted = true): Promise<void> {
    if (!sessionUser) return;
    try {
      const data = await loadApplicationData(sessionUser);
      if (!mounted) return;
      setProducts(data.products);
      setCategories(data.categories);
      setSuppliers(data.suppliers);
      setMovements(data.movements);
      setUsers(data.users);
      setBatches(data.batches);
    } catch (error) {
      if (mounted) Alert.alert('Não foi possível atualizar os dados', errorMessage(error));
    } finally {
      if (mounted) setDataReady(true);
    }
  }

  async function applySession(session: { token: string; user: User; market: Market }, password?: string): Promise<void> {
    accessToken.current = session.token;
    setApiAccessToken(session.token);
    setUser(session.user);
    setMarket(session.market);
    setScreen('dashboard');
    setDataReady(false);
    if (session.user.mustChangePassword) {
      setTemporaryPassword(password ?? '');
      await removeAccessToken();
      return;
    }
    await saveAccessToken(session.token);
    await refreshData(session.user);
  }

  async function login(username: string, password: string): Promise<void> {
    try {
      setAuthBusy(true);
      setLoginError('');
      await applySession(await authApi.login(username, password), password);
    } catch (error) {
      setLoginError(errorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function registerMarket(input: RegistrationInput): Promise<void> {
    try {
      setAuthBusy(true);
      setRegistrationError('');
      const session = await authApi.registerMarket(input);
      await applySession(session);
      setAuthMode('login');
      Alert.alert('Mercado cadastrado', `${session.market.name} está pronto para receber produtos e funcionários.`);
    } catch (error) {
      setRegistrationError(errorMessage(error));
    } finally {
      setAuthBusy(false);
    }
  }

  async function completeFirstAccess(newPassword: string): Promise<boolean> {
    if (!user || !temporaryPassword || !accessToken.current) return false;
    try {
      await authApi.changePassword(temporaryPassword, newPassword);
      const updatedUser = { ...user, mustChangePassword: false };
      setUser(updatedUser);
      setTemporaryPassword('');
      await saveAccessToken(accessToken.current);
      await refreshData(updatedUser);
      Alert.alert('Senha definida', 'Sua senha pessoal foi salva. Agora você pode acessar o aplicativo.');
      return true;
    } catch (error) {
      Alert.alert('Não foi possível alterar a senha', errorMessage(error));
      return false;
    }
  }

  async function endSession(expired = false): Promise<void> {
    accessToken.current = undefined;
    setApiAccessToken(undefined);
    await removeAccessToken();
    setUser(undefined);
    setMarket(undefined);
    setTemporaryPassword('');
    setProducts([]);
    setCategories([]);
    setSuppliers([]);
    setUsers([]);
    setBatches([]);
    setMovements([]);
    setDataReady(false);
    setAuthMode('login');
    setScreen('dashboard');
    if (expired) setLoginError('Sua sessão expirou. Entre novamente.');
  }

  const addEmployee = async (input: EmployeeRegistrationInput) => runMutation(
    () => usersApi.create(input), 'Funcionário cadastrado', `Acesso criado para ${input.name}. A senha deverá ser trocada no primeiro login.`,
  );

  const toggleEmployeeStatus = async (employeeId: number) => {
    const employee = employees.find((candidate) => candidate.id === employeeId);
    if (employee) await runMutation(() => usersApi.setStatus(employeeId, !employee.active));
  };

  const addSupplier = async (input: SupplierRegistrationInput) => runMutation(
    () => suppliersApi.create(input), 'Fornecedor cadastrado', `${input.name} foi adicionado ao mercado.`,
  );

  const toggleSupplierStatus = async (supplierId: number) => {
    const supplier = suppliers.find((candidate) => candidate.id === supplierId);
    if (supplier) await runMutation(() => suppliersApi.setStatus(supplierId, !supplier.active));
  };

  const addCategory = async (name: string) => runMutation(
    () => categoriesApi.create(name), 'Categoria cadastrada', `${name} já pode ser selecionada nos produtos.`,
  );

  const editCategory = async (categoryId: number, name: string) => runMutation(
    () => categoriesApi.update(categoryId, name), 'Categoria atualizada', `O novo nome é ${name}.`,
  );

  const toggleCategoryStatus = async (categoryId: number) => {
    const category = categories.find((candidate) => candidate.id === categoryId);
    if (category) await runMutation(() => categoriesApi.setStatus(categoryId, !category.active));
  };

  const addProduct = async (
    data: Omit<Product, 'id' | 'marketId' | 'active'>,
    initialBatchCode?: string,
    supplierId?: number,
    purchasePrice?: number,
  ) => runMutation(
    () => productsApi.create(data, initialBatchCode && supplierId && purchasePrice !== undefined
      ? { batchCode: initialBatchCode, supplierId, purchasePrice }
      : undefined),
    'Produto cadastrado', `${data.name} foi adicionado ao estoque.`,
  );

  const registerMovement = async (productId: number, quantity: number, batchCode?: string, expiryDate?: string, supplierId?: number, purchasePrice?: number) => {
    if (!batchCode || !expiryDate || !supplierId || purchasePrice === undefined) return false;
    const saved = await runMutation(() => inventoryApi.entry({ productId, quantity, batchCode, expiryDate, supplierId, purchasePrice }));
    if (saved) {
      setMovementType(undefined);
      Alert.alert('Entrada registrada', 'O saldo e o lote do produto foram atualizados.');
    }
    return saved;
  };

  const registerStockExit = async (items: StockExitItemInput[], reason: StockExitReason) => {
    const saved = await runMutation(() => inventoryApi.exit(items, reason));
    if (saved) {
      setMovementType(undefined);
      Alert.alert('Saída registrada', `${items.length} produto${items.length === 1 ? '' : 's'} atualizado${items.length === 1 ? '' : 's'} pela ordem FEFO.`);
    }
    return saved;
  };

  const openProduct = async (product: Product) => {
    setSelectedProduct(product);
    if (!user) return;
    try {
      const detail = await productsApi.detail(product.id, user.marketId);
      setSelectedProduct(detail.product);
      setBatches((current) => [...current.filter((batch) => batch.productId !== product.id), ...detail.batches]);
    } catch (error) {
      Alert.alert('Não foi possível carregar os lotes', errorMessage(error));
    }
  };

  const deactivateProduct = (productId: number) => {
    Alert.alert('Inativar produto?', 'O produto deixará de aparecer nas operações, mas o histórico será preservado.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Inativar', style: 'destructive', onPress: () => {
          void (async () => {
            const saved = await runMutation(() => productsApi.setStatus(productId, false));
            if (saved) setSelectedProduct(undefined);
          })();
        },
      },
    ]);
  };

  async function runMutation(work: () => Promise<unknown>, successTitle?: string, successMessage?: string): Promise<boolean> {
    try {
      await work();
      await refreshData();
      if (successTitle) Alert.alert(successTitle, successMessage);
      return true;
    } catch (error) {
      Alert.alert('Não foi possível concluir', errorMessage(error));
      return false;
    }
  }

  const navigate = (next: ScreenKey) => {
    if (next !== 'profile') setPreviousScreen(next);
    setScreen(next);
  };

  const openProfile = () => {
    if (screen !== 'profile') setPreviousScreen(screen);
    setScreen('profile');
  };

  if (!appReady) return <LoadingScreen label="Restaurando sessão segura..." />;

  if (!user) {
    if (authMode === 'register') {
      return (
        <SafeAreaView style={styles.safe}>
          <StatusBar style="dark" backgroundColor={colors.background} />
          <RegisterScreen busy={authBusy} error={registrationError} onBack={() => { setAuthMode('login'); setRegistrationError(''); }} onRegister={registerMarket} />
        </SafeAreaView>
      );
    }
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="light" />
        <LoginScreen busy={authBusy} onLogin={login} onRegisterPress={() => { setAuthMode('register'); setLoginError(''); }} error={loginError} />
      </SafeAreaView>
    );
  }

  if (user.mustChangePassword) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar style="dark" backgroundColor={colors.background} />
        <ChangePasswordScreen userName={user.name} onConfirm={completeFirstAccess} onLogout={() => { void endSession(); }} />
      </SafeAreaView>
    );
  }

  if (!dataReady) return <LoadingScreen label="Carregando estoque do mercado..." />;

  const header = screenTitles[screen];
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" backgroundColor={colors.white} />
      <View style={styles.app}>
        <AppHeader title={header.title} subtitle={header.subtitle} user={user} marketName={market?.name ?? 'Mercado'} onProfilePress={openProfile} />
        <View style={styles.screen}>
          {screen === 'dashboard' && <DashboardScreen user={user} products={activeProducts} movements={movements} onProducts={() => navigate('products')} onEntry={() => setMovementType('ENTRY')} onExit={() => setMovementType('EXIT')} onReports={() => navigate('reports')} />}
          {screen === 'products' && <ProductsScreen products={activeProducts} categories={categories} role={user.role} onAdd={() => setProductFormOpen(true)} onCategories={() => navigate('categories')} onSuppliers={() => navigate('suppliers')} onProductPress={(product) => { void openProduct(product); }} />}
          {screen === 'categories' && user.role === 'ADMIN' && <CategoriesScreen categories={categories} products={activeProducts} onAdd={addCategory} onEdit={editCategory} onToggleStatus={(id) => { void toggleCategoryStatus(id); }} />}
          {screen === 'suppliers' && user.role === 'ADMIN' && <SuppliersScreen suppliers={suppliers} onAdd={addSupplier} onToggleStatus={(id) => { void toggleSupplierStatus(id); }} />}
          {screen === 'movements' && <MovementsScreen movements={movements} onNewMovement={setMovementType} />}
          {screen === 'users' && user.role === 'ADMIN' && <UsersScreen employees={employees} onAdd={addEmployee} onToggleStatus={(id) => { void toggleEmployeeStatus(id); }} />}
          {screen === 'reports' && user.role === 'ADMIN' && market && <ReportsScreen market={market} products={activeProducts} batches={batches} movements={movements} />}
          {screen === 'profile' && <ProfileScreen user={user} market={market} onBack={() => setScreen(previousScreen)} onLogout={() => { void endSession(); }} />}
        </View>
        {screen !== 'profile' ? <BottomNav active={screen} role={user.role} onChange={navigate} /> : null}
      </View>

      <ProductFormModal visible={productFormOpen} suppliers={activeSuppliers} categories={activeCategories} onClose={() => setProductFormOpen(false)} onSave={addProduct} />
      <MovementModal visible={movementType === 'ENTRY'} type="ENTRY" products={activeProducts} suppliers={activeSuppliers} onClose={() => setMovementType(undefined)} onConfirm={registerMovement} />
      <StockExitModal visible={movementType === 'EXIT'} products={activeProducts} onClose={() => setMovementType(undefined)} onConfirm={registerStockExit} />
      <ProductDetailModal product={selectedProduct} batches={selectedProductBatches} suppliers={suppliers} role={user.role} onClose={() => setSelectedProduct(undefined)} onDeactivate={deactivateProduct} />
    </SafeAreaView>
  );
}

function LoadingScreen({ label }: { label: string }) {
  return (
    <SafeAreaView style={styles.loading}>
      <StatusBar style="dark" backgroundColor={colors.background} />
      <View style={styles.loadingLogo}><Text style={styles.loadingLogoText}>LC</Text></View>
      <ActivityIndicator color={colors.primary} size="large" style={styles.loadingIndicator} />
      <Text style={styles.loadingText}>{label}</Text>
      <Text style={styles.loadingApi}>{API_URL}</Text>
    </SafeAreaView>
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return 'Tente novamente em alguns instantes.';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.white },
  app: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: colors.background },
  loadingLogo: { width: 68, height: 68, borderRadius: 22, backgroundColor: colors.primaryDark, alignItems: 'center', justifyContent: 'center' },
  loadingLogoText: { color: colors.white, fontSize: 22, fontWeight: '900' },
  loadingIndicator: { marginTop: 24 },
  loadingText: { color: colors.text, fontSize: 14, fontWeight: '800', marginTop: 14 },
  loadingApi: { color: colors.textMuted, fontSize: 9, marginTop: 7, textAlign: 'center' },
});
