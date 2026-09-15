import { createContext, useContext } from "react";

/** Set by Layout when the current page is a specific tour, so builder blocks
 *  nested anywhere inside (e.g. a Hero button with href "#book") can open
 *  that tour's booking modal instead of navigating. Null outside tour pages. */
export const BookingModalContext = createContext<(() => void) | null>(null);

export const useOpenBookingModal = () => useContext(BookingModalContext);
