import { useEffect, useState } from 'react';

// Returns a copy of `value` that only updates after `delay` ms of no changes.
// Used to keep search/filter typing smooth when there are many loaded rows.
export function useDebouncedValue(value, delay = 200) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const timer = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);
    return debounced;
}
