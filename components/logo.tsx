import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  href?: string;
}

const sizes = {
  sm: { width: 80, height: 25 },
  md: { width: 110, height: 34 },
  lg: { width: 140, height: 44 },
};

export function Logo({ size = 'md', href = '/' }: LogoProps) {
  const { width, height } = sizes[size];

  const logo = (
    <Image
      src="/images/logo.svg"
      alt="Qiplim"
      width={width}
      height={height}
      priority
    />
  );

  if (href) {
    return (
      <Link href={href} className="flex items-center">
        {logo}
      </Link>
    );
  }

  return logo;
}
