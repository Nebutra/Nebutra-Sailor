/**
 * @deprecated Import Card from `@nebutra/ui/primitives`. This path re-exports
 * the one Card, which now carries this module's variant / padding props and
 * compound parts (Card.Header, Card.Body, …). `variant="bordered"` is
 * `variant="outline"`; `variant="gradient"` was dropped.
 */
export {
  Card,
  CardBody,
  type CardBodyProps,
  CardDescription,
  type CardDescriptionProps,
  CardFooter,
  type CardFooterProps,
  CardHeader,
  type CardHeaderProps,
  CardIcon,
  type CardIconProps,
  type CardProps,
  CardRoot,
  CardTitle,
  type CardTitleProps,
} from "../../primitives/card";
