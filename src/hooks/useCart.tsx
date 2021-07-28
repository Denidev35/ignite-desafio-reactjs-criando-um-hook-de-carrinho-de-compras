import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart')

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId)

      const currentAmount = productExists ? productExists.amount : 0
      const newAmount = currentAmount + 1

      const response = await api.get(`/stock/${productId}`)
      const stockAmount = response.data

      if(newAmount > stockAmount.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      } 

      let updateCart: Product[] = []

      if(productExists) {
        updateCart = cart.map(product => product.id !== productId ? product : {
          ...product,
          amount: newAmount
        })
        setCart(updateCart)
      } else {
        const { data } = await api.get(`/products/${productId}`)
        const newProduct = {
          ...data,
          amount: 1
        }

        updateCart = [...cart, newProduct]
        setCart(updateCart)
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productExists = cart.find(product => product.id === productId)

      if(!productExists) {
        throw new Error()
      }

      const cartFiltered = cart.filter(product => product.id !== productId)
      setCart(cartFiltered)
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartFiltered))

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount < 1) {
        throw new Error()
      }

      const response = await api.get(`/stock/${productId}`)
      const stockAmount = response.data

      if(amount > stockAmount.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return
      }

      const updateCart = cart.map(product => product.id !== productId ? product : {
        ...product,
        amount,
      })
      setCart(updateCart)

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updateCart))
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
