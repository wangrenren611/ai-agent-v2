import { createContext, useContext, useState } from 'react';
import React from 'react';

export type AppContextType = {
  route: string;
  setRoute: (newRoute: string) => void;
};

const AppContext = createContext<AppContextType>({
  route: '/home',
  setRoute: (newRoute: string) => {},
});


export const AppContextProvider = ({ children }: { children: React.ReactNode })=>{
   const [route, setRoute] = useState('/home');

   const onRouteChange = (newRoute: string) => {
     setRoute(newRoute);
   };

    return (
        <AppContext.Provider value={{ route, setRoute: onRouteChange }}>    
            {children}
        </AppContext.Provider>
    );
};


export const useAppContext = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppContext must be used within an AppContextProvider');
    }
    return context;
};