export const OPTION_GROUP_REGISTRY = [
  {
    key: "inventory.article.size",
    moduleKey: "inventory",
    label: "Article Size",
    description: "Reusable size values available to article forms.",
    storageKey: "article_sizes",
  },
  {
    key: "inventory.article.category",
    moduleKey: "inventory",
    label: "Article Category",
    description: "Reusable category values available to article forms.",
    storageKey: "article_categories",
  },
];

export const getOptionGroupsByModule = () => OPTION_GROUP_REGISTRY.reduce((groups, option) => {
  const list = groups.get(option.moduleKey) || [];
  list.push(option);
  groups.set(option.moduleKey, list);
  return groups;
}, new Map());
