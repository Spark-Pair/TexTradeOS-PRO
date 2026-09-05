import React from 'react';

const SidebarNavItem = ({
  icon,
  label,
  isActive,
  onClick,
  onMouseEnter,
  onFocus,
  isSubItem = false,
  className,
}) => {
  const baseClasses = `
    w-full text-left py-2.5 px-4 flex items-center gap-3 cursor-pointer
    ${isSubItem ? 'pl-8 text-sm text-gray-600' : ''}
  `;
  
  const activeClasses = isActive
    ? 'bg-[#dcefed] text-[#176b68] rounded-xl font-medium'
    : 'text-gray-700 hover:bg-teal-50 hover:text-[#176b68] rounded-xl';

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      className={`${className} ${baseClasses} ${activeClasses}`}
    >
      {!isSubItem && <span>{icon}</span>}
      <span>{label}</span>
    </button>
  );
};

export default SidebarNavItem;
