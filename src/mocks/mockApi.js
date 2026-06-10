const MOCK_USER = {
  _id: "mock-user-admin",
  id: "mock-user-admin",
  name: "TexTrade Admin",
  username: "admin",
  role: "admin",
  isActive: true,
  shortcuts: {},
  businessId: "mock-business",
  business: {
    id: "mock-business",
    _id: "mock-business",
    name: "TexTrade Demo",
  },
  subscription: {
    active: true,
    readOnly: false,
    status: "active",
    expiresAt: "2099-12-31T23:59:59.999Z",
  },
};

const referenceData = {
  user_roles: ["admin", "staff"],
  attendance_options: ["Day", "Night", "Half", "Absent", "Off", "Close", "Sunday"],
  customer_payment_methods: ["cash", "cheque", "slip", "online", "adjustment"],
  staff_payment_types: ["advance", "payment", "adjustment"],
  expense_types: ["supplier", "cash", "fixed_cash", "fixed_supplier", "fixed"],
  staff_categories: ["Embroidery", "Cropping"],
};

const emptyPage = () => ({
  data: [],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 30,
  },
});

const response = (config, data, status = 200) =>
  Promise.resolve({
    data,
    status,
    statusText: "OK",
    headers: {},
    config,
    request: null,
  });

const normalizePath = (config) => {
  const raw = String(config?.url || "/");
  try {
    return new URL(raw, "http://textrade.local").pathname;
  } catch {
    return raw.split("?")[0];
  }
};

const parseBody = (config) => {
  if (!config?.data) return {};
  if (typeof config.data === "object") return config.data;
  try {
    return JSON.parse(config.data);
  } catch {
    return {};
  }
};

export const mockApiAdapter = async (config) => {
  const path = normalizePath(config);
  const method = String(config?.method || "get").toLowerCase();
  const body = parseBody(config);

  if (path === "/auth/login" && method === "post") {
    const user = {
      ...MOCK_USER,
      username: body?.username || MOCK_USER.username,
      name: body?.username ? String(body.username) : MOCK_USER.name,
    };
    return response(config, {
      accessToken: "textrade-mock-access",
      refreshToken: "textrade-mock-refresh",
      sessionId: "textrade-mock-session",
      user,
    });
  }

  if (path === "/auth/me") return response(config, MOCK_USER);
  if (path === "/auth/refresh") return response(config, { accessToken: "textrade-mock-access" });
  if (path === "/auth/sessions") {
    return response(config, {
      data: [{
        _id: "textrade-mock-session",
        id: "textrade-mock-session",
        current: true,
        device: "Local mock session",
        createdAt: new Date().toISOString(),
      }],
    });
  }
  if (path.startsWith("/auth/")) return response(config, { success: true });

  if (path === "/businesses/me/reference-data") {
    return response(config, { reference_data: method === "patch" ? body.reference_data : referenceData });
  }
  if (path === "/businesses/me/rule-data") {
    return response(config, { rule_data: method === "patch" ? body.rule_data : {} });
  }
  if (path === "/businesses/me/machine-options") {
    return response(config, { machine_options: body.machine_options || [] });
  }
  if (path === "/businesses/me/invoice-banner") {
    return response(config, { invoice_banner_data: body.invoice_banner_data || "" });
  }
  if (path === "/businesses/me/invoice-counter") {
    return response(config, { year: new Date().getFullYear(), counter: Number(body.counter || 1) });
  }
  if (path === "/subscriptions/me") return response(config, MOCK_USER.subscription);

  if (path.endsWith("/stats")) {
    return response(config, {
      success: true,
      data: { total: 0, active: 0, inactive: 0 },
    });
  }
  if (path.endsWith("/months")) return response(config, { data: [] });
  if (path.endsWith("/names")) return response(config, { data: [] });
  if (path.endsWith("/statement")) return response(config, { data: [], summary: {} });
  if (path.includes("/dashboard/")) return response(config, { success: true, data: {} });

  if (method === "get") return response(config, emptyPage());

  const id = path.split("/").filter(Boolean).at(-1);
  const entity = {
    _id: id && !["customers", "suppliers", "staffs", "orders", "expenses", "invoices"].includes(id)
      ? id
      : `mock-${Date.now()}`,
    ...body,
    isActive: body.isActive ?? true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  return response(config, entity);
};

export const getMockUser = () => ({ ...MOCK_USER });
