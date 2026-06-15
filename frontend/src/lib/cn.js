// Tiny classNames helper: joins truthy class strings.
export function cn(...classes) {
    return classes.filter(Boolean).join(' ');
}
