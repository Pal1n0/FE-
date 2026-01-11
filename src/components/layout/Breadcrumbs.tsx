import { useLocation, Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Fragment } from 'react';
import { ChevronRight } from 'lucide-react'; // Using ChevronRight icon for separator
import useUIStore from '@/store/useUIStore'; // Import the UI store

interface BreadcrumbItem {
  name: string;
  path: string;
  isClickable: boolean;
}

export function Breadcrumbs() {
  const { t } = useTranslation();
  const location = useLocation();
  const params = useParams(); // Get URL parameters
  const { dynamicSegmentNames } = useUIStore(); // Get dynamic segment names from store
  const { workspaceId } = params;
  
  // Filter pathnames based on the user's requirements
  const filteredPathnames = location.pathname.split('/').filter(x => x).filter(pathname => {
    // If the current path is NOT a workspace settings path, filter out the workspaceId
    if (!location.pathname.startsWith('/settings/workspaces/')) {
      return pathname !== workspaceId;
    }
    return true; // Keep all pathnames for workspace settings
  });

  const breadcrumbItems: BreadcrumbItem[] = [];
  let currentPath = '';

  filteredPathnames.forEach((pathname, index) => {
    currentPath += `/${pathname}`;
    let displayName = pathname;
    let isClickable = true;

    // Special handling for dynamic segments (like workspace ID)
    // Check if the current pathname segment matches any of the values in useParams
    const isParam = Object.values(params).includes(pathname);

    if (isParam) {
      const paramKey = Object.keys(params).find(key => params[key] === pathname);
      if (paramKey) {
        displayName = dynamicSegmentNames[params[paramKey]] || pathname;
      } else {
        displayName = pathname;
      }
      isClickable = true; 
    } else {
      // Try to translate using common patterns
      const navKey = `nav.${pathname}`;
      const titleKey = `${pathname}.title`;
      const genericKey = `breadcrumbs.${pathname}`; 

      if (t(navKey) !== navKey) { 
        displayName = t(navKey);
      } else if (t(titleKey) !== titleKey) { 
        displayName = t(titleKey);
      } else if (t(genericKey) !== genericKey) { 
        displayName = t(genericKey);
      } else {
        // Fallback to capitalized version if no specific translation found
        displayName = pathname.charAt(0).toUpperCase() + pathname.slice(1);
      }
    }

    breadcrumbItems.push({
      name: displayName,
      path: currentPath,
      isClickable: isClickable,
    });
  });

  return (
    <nav className="flex" aria-label="Breadcrumb">
      <ol className="inline-flex items-center">
        <li className="inline-flex items-center">
          <Link to="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white">
            {t('breadcrumbs.home', { defaultValue: 'Home' })}
          </Link>
        </li>
        {breadcrumbItems.map((item, index) => (
          <li key={item.path} aria-current={index === breadcrumbItems.length - 1 ? 'page' : undefined}>
            <div className="flex items-center">
              <ChevronRight className="rtl:rotate-180 w-3 h-3 text-gray-400 mx-0.5" /> {/* Separator */}
              {index === breadcrumbItems.length - 1 || !item.isClickable ? (
                <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  {item.name}
                </span>
              ) : (
                <Link to={item.path} className="text-sm font-medium text-gray-700 hover:text-blue-600 dark:text-gray-400 dark:hover:text-white">
                  {item.name}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>
    </nav>
  );
}
