import { useInput } from 'ink';
import type { Key as EventKey } from 'ink';
import { createContext, useContext, useEffect, useState } from 'react';
import React from 'react';
import { ProviderType } from '../../providers/provider-registry';
import useAgent from '../hooks/use-agent';
import { Message } from '../../agent/message';

export type AppContextType = {
  route: string;
  setRoute: (newRoute: string) => void;
  isEscape: boolean;
  input: string;
  messages: Message[];
  setInput: (newInput: string) => void;  
  onSubmit: (newInput: string) => void;
  isLoading: boolean;
  model: ProviderType;
  usedTokens: {
    usedTokens: number;
    totalTokens: number;
  };
};

const AppContext = createContext<AppContextType>({
  route: '/home',
  setRoute: (newRoute: string) => {},
  isEscape: false,
  input: '',
  messages: [],
  setInput: (newInput: string) => {},
  onSubmit: (newInput: string) => {},
  isLoading: false,
  model: ProviderType.GLM,
  usedTokens: {
    usedTokens: 0,
    totalTokens: 0,
  },
});
// {
//   upArrow: false,
//   downArrow: false,
//   leftArrow: false,
//   rightArrow: false,
//   pageDown: false,
//   pageUp: false,
//   return: false,
//   escape: false,
//   ctrl: false,
//   shift: false,
//   tab: false,
//   backspace: false,
//   delete: false,
//   meta: false
// }

export const AppContextProvider = ({ children }: { children: React.ReactNode })=>{
   const [route, setRoute] = useState('/home');
   const [eventKey, setEventKey] = useState<EventKey>();
   const [input, setInput] = useState('');
   const [model, setModel] = useState<ProviderType>(ProviderType.GLM);
   const {submitMessage, messages, isLoading,usedTokens} = useAgent({model});


   const onRouteChange = (newRoute: string) => {
     setRoute(newRoute);
   };

  useInput((input, key) => {
     setEventKey(key);
  });
  
  useEffect(() => {
     if(eventKey?.escape&&route === '/home') {
      process.exit(0);
     }
  }, [eventKey?.escape]);

   const onSubmit = (newInput: string) => {
      setInput(newInput);
      submitMessage(newInput);
      setInput('');
   }
  
    return (
        <AppContext.Provider value={{ route,model,usedTokens, input, messages, setInput,onSubmit, setRoute: onRouteChange,isEscape: !!eventKey?.escape, isLoading }}>    
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