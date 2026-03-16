import { useQuery } from '@tanstack/react-query';
import { getStepLibrary } from '../api/steps';

export function useStepLibrary() {
  return useQuery({
    queryKey: ['step-library'],
    queryFn: getStepLibrary,
    staleTime: 1000 * 60 * 5
  });
}
