export type DropdownData = {
  closeDropdownFunc: () => void;
};

export default class DropdownManager {
  public static currentOpenDropdown: DropdownData | null = null;

  public static setCurrentOpenDropdown(dropdownData: DropdownData | null) {
    this.currentOpenDropdown = dropdownData;
  }
}
