export const OPTION_GROUP_REGISTRY = [
  {
    key: "payments.method",
    moduleKey: "payments",
    label: "Payment Methods",
    description: "Payment methods available when receiving or recording payments.",
    storageKey: "payment_methods",
  },
];

export const getOptionGroupsByModule = () => OPTION_GROUP_REGISTRY.reduce((groups, option) => {
  const list = groups.get(option.moduleKey) || [];
  list.push(option);
  groups.set(option.moduleKey, list);
  return groups;
}, new Map());
