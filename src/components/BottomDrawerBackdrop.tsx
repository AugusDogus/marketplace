import { BottomSheetBackdrop, type BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

export function BottomDrawerBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.36}
      pressBehavior="close"
    />
  );
}
