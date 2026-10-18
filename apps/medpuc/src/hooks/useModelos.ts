import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { importarDoModelo, listarModelos } from '../servicos/modelos';
import { chaves } from './chaves';

export function useModelos(somentePublicados = true) {
  return useQuery({ queryKey: chaves.modelos(somentePublicados), queryFn: () => listarModelos(somentePublicados) });
}

export function useImportarModelo() {
  const cliente = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, importarDatas }: { ids: string[]; importarDatas: boolean }) =>
      importarDoModelo(ids, importarDatas),
    onSuccess: () => {
      cliente.invalidateQueries({ queryKey: chaves.disciplinas });
      cliente.invalidateQueries({ queryKey: chaves.eventos });
      cliente.invalidateQueries({ queryKey: chaves.uso });
    },
  });
}
